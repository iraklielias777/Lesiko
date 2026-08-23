// Product-photo normalisation, Node/sharp implementation.
//
// This is the counterpart of lib/image-normalize.ts, which runs the same
// algorithm in the browser on new admin uploads. The constants and the decision
// order have to match, or a backfilled image will not sit in the grid the same
// way as one uploaded through the panel. Any change belongs in both files —
// the same arrangement as lib/seo.ts / supabase/functions/seo/seo-core.ts.
//
// scripts/normalize-core.test.mjs checks this against a set of synthetic cases
// that mirror the shapes found in the live catalogue.

import sharp from 'sharp';

const CANVAS = 1200;
const MARGIN = 0.06;
const MAX_UPSCALE = 2.1;
const ANALYSIS_EDGE = 512;
const CONTENT_TOLERANCE = 18;
const ROW_NOISE_FLOOR = 0.004;
const UNIFORM_SPREAD = 16;
const MIN_BACKDROP_LEVEL = 200;
const EDGE_TO_EDGE = 0.985;
// See lib/image-normalize.ts: cropping a tall scene to square would clip it.
const MAX_COVER_CROP = 0.12;
const LOW_FILL_WARNING = 0.18;
const SOFT_UPSCALE_WARNING = 1.6;
const WEBP_QUALITY = 82;


export const constants = {
  CANVAS, MARGIN, MAX_UPSCALE, ANALYSIS_EDGE, CONTENT_TOLERANCE,
  ROW_NOISE_FLOOR, UNIFORM_SPREAD, MIN_BACKDROP_LEVEL, EDGE_TO_EDGE, MAX_COVER_CROP,
  LOW_FILL_WARNING, SOFT_UPSCALE_WARNING, WEBP_QUALITY,
};
export { LOW_FILL_WARNING, SOFT_UPSCALE_WARNING };

const median = values => {
  if (!values.length) return 255;
  const sorted = Float64Array.from(values).sort();
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const percentileSpread = channel => {
  const sorted = Float64Array.from(channel).sort();
  return sorted[Math.floor(sorted.length * 0.95)] - sorted[Math.floor(sorted.length * 0.05)];
};

const toHex = (r, g, b) =>
  `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

/** Backdrop = what the border ring agrees on. Median resists a product that runs off an edge. */
const readBackdrop = (data, width, height) => {
  const ch = [[], [], []];
  const push = (x, y) => {
    const i = (y * width + x) * 3;
    ch[0].push(data[i]); ch[1].push(data[i + 1]); ch[2].push(data[i + 2]);
  };
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }

  const rgb = ch.map(median);
  const spread = Math.max(...ch.map(percentileSpread));
  return {
    rgb,
    spread,
    uniform: spread <= UNIFORM_SPREAD && Math.min(...rgb) >= MIN_BACKDROP_LEVEL,
  };
};

const findContentBox = (data, width, height, bg) => {
  const rowHits = new Uint32Array(height);
  const colHits = new Uint32Array(width);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const diff = Math.max(
        Math.abs(data[i] - bg[0]),
        Math.abs(data[i + 1] - bg[1]),
        Math.abs(data[i + 2] - bg[2]),
      );
      if (diff > CONTENT_TOLERANCE) { rowHits[y]++; colHits[x]++; }
    }
  }

  const rowFloor = Math.max(1, Math.round(width * ROW_NOISE_FLOOR));
  const colFloor = Math.max(1, Math.round(height * ROW_NOISE_FLOOR));

  let top = -1, bottom = -1, left = -1, right = -1;
  for (let y = 0; y < height; y++) if (rowHits[y] >= rowFloor) { if (top < 0) top = y; bottom = y; }
  for (let x = 0; x < width; x++) if (colHits[x] >= colFloor) { if (left < 0) left = x; right = x; }

  if (top < 0 || left < 0) return null;
  return { left, top, right: right + 1, bottom: bottom + 1 };
};

/** Returns { buffer|null, bgColor, fit, fillRatio, upscale, reason }. */
export const normalize = async source => {
  const image = sharp(source, { failOn: 'none' }).rotate();
  const meta = await image.metadata();
  const sw = meta.width, sh = meta.height;
  if (!sw || !sh) return { buffer: null, bgColor: '#ffffff', fit: 'contain', reason: 'unsupported' };

  const ratio = sw / sh;
  const cropSafe = 1 - Math.min(ratio, 1 / ratio) <= MAX_COVER_CROP;
  const photograph = bgColor => ({ buffer: null, bgColor, fit: cropSafe ? 'cover' : 'contain', reason: 'lifestyle' });

  const scale = Math.min(1, ANALYSIS_EDGE / Math.max(sw, sh));
  const aw = Math.max(1, Math.round(sw * scale));
  const ah = Math.max(1, Math.round(sh * scale));

  const { data } = await sharp(source, { failOn: 'none' })
    .rotate()
    .resize(aw, ah, { fit: 'fill' })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const backdrop = readBackdrop(data, aw, ah);
  const bgColor = toHex(...backdrop.rgb);

  if (!backdrop.uniform) return photograph(bgColor);

  const box = findContentBox(data, aw, ah, backdrop.rgb);
  if (!box) return { buffer: null, bgColor, fit: 'contain', reason: 'no-content' };

  const boxW = box.right - box.left;
  const boxH = box.bottom - box.top;
  if (boxW / aw >= EDGE_TO_EDGE && boxH / ah >= EDGE_TO_EDGE) {
    return photograph(bgColor);
  }

  const inv = 1 / scale;
  const cropX = Math.max(0, Math.floor(box.left * inv));
  const cropY = Math.max(0, Math.floor(box.top * inv));
  const cropW = Math.min(sw - cropX, Math.ceil(boxW * inv));
  const cropH = Math.min(sh - cropY, Math.ceil(boxH * inv));
  if (cropW < 2 || cropH < 2) return { buffer: null, bgColor, fit: 'contain', reason: 'no-content' };

  const safe = CANVAS * (1 - 2 * MARGIN);
  const upscale = Math.min(Math.min(safe / cropW, safe / cropH), MAX_UPSCALE);
  const drawW = Math.max(1, Math.round(cropW * upscale));
  const drawH = Math.max(1, Math.round(cropH * upscale));

  const product = await sharp(source, { failOn: 'none' })
    .rotate()
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .resize(drawW, drawH, { kernel: 'lanczos3', fit: 'fill' })
    .flatten({ background: bgColor })
    .toBuffer();

  const [r, g, b] = backdrop.rgb.map(v => Math.round(v));
  const buffer = await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 3, background: { r, g, b } },
  })
    .composite([{
      input: product,
      left: Math.round((CANVAS - drawW) / 2),
      top: Math.round((CANVAS - drawH) / 2),
    }])
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return {
    buffer,
    bgColor,
    fit: 'contain',
    fillRatio: (drawW * drawH) / (CANVAS * CANVAS),
    upscale,
    reason: 'normalised',
  };
};


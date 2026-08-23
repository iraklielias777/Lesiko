/**
 * Product-photo normalisation.
 *
 * Suppliers ship the same product line at wildly different framings: measured
 * across the live catalogue, the median product photo is 65% empty background,
 * with ~31% dead margin on the left and right (tall products padded out to a
 * square canvas by whoever produced the asset). Dropping those files into a
 * fixed card and letting `object-contain` sort it out pads them a second time,
 * so the rendered product ends up anywhere between 25% and 100% of the card
 * height — a 4x spread that reads as a broken grid.
 *
 * This module removes the supplier's framing and imposes ours: find the real
 * product, crop to it, and re-centre it on a canonical square with a fixed
 * margin. Everything lands at the same size, so the grid has one rhythm.
 *
 * Two things it deliberately does NOT do:
 *
 *   * It never recolours a backdrop. Lifting a light-grey studio background to
 *     white destroys white products — a white pump head is closer to #E8E8E8
 *     than the backdrop is, so any colour-distance threshold eats it. Instead
 *     the detected background travels with the image as `bgColor`, and the card
 *     paints its frame that colour, so a grey photo sits in a grey frame with
 *     no seam.
 *   * It never magnifies a product past `MAX_UPSCALE`. Perfect uniformity would
 *     need up to 2.4x upscaling on a quarter of the catalogue, which is visibly
 *     soft on a retina card. Capping trades a little uniformity for sharpness.
 *
 * Lifestyle shots (non-uniform backdrop — a hand, a bathroom counter, a
 * gradient) are left alone and marked `cover`, because cropping to fill is the
 * right treatment for a photograph and letterboxing is not.
 */

export type ImageFit = 'contain' | 'cover';

export interface NormalizeResult {
  /** Normalised bitmap source, ready to encode. Null when we left it alone. */
  canvas: OffscreenCanvas | HTMLCanvasElement | null;
  /** Detected backdrop, as #rrggbb. The card paints its frame this colour. */
  bgColor: string;
  fit: ImageFit;
  /** Share of the canvas the product occupies, 0-1. Low means a poor source. */
  fillRatio: number;
  /** How far the product was magnified. >1 means we invented pixels. */
  upscale: number;
  reason: 'normalised' | 'lifestyle' | 'no-content' | 'unsupported';
}

/** Output square. Flat padding costs almost nothing in WebP. */
const CANVAS = 1200;
/** Breathing room on each side, as a fraction of the canvas. */
const MARGIN = 0.06;
/**
 * Ceiling on magnification relative to the native crop. Chosen from the live
 * catalogue: at 2.1x the worst case is a 1.6x upscale at the largest delivered
 * width (900w), which stays sharp, while ~90% of products still reach the full
 * safe area. Raising it buys ~0.3x of uniformity at the cost of mush.
 */
const MAX_UPSCALE = 2.1;

/** Long edge used for background/bbox analysis. Full res buys no accuracy. */
const ANALYSIS_EDGE = 512;
/** Channel distance from the backdrop before a pixel counts as product. */
const CONTENT_TOLERANCE = 18;
/**
 * A row only counts as containing product if this share of it differs from the
 * backdrop, so JPEG ringing and a stray dust speck cannot defeat the crop.
 */
const ROW_NOISE_FLOOR = 0.004;
/** Max per-channel spread across the border ring for a backdrop to be "studio". */
const UNIFORM_SPREAD = 16;
/** Backdrops darker than this are photographs, not sweeps. */
const MIN_BACKDROP_LEVEL = 200;
/** A product touching every edge is a photograph that should crop, not pad. */
const EDGE_TO_EDGE = 0.985;
/**
 * How much of a photograph a square crop may discard before cropping stops
 * being safe. A composed shot that is already near-square loses nothing worth
 * keeping, but centre-cropping a tall bottle-on-a-shadow by a third will slice
 * the product, so those letterbox against their own border colour instead.
 */
const MAX_COVER_CROP = 0.12;

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

const makeCanvas = (width: number, height: number): AnyCanvas =>
  typeof OffscreenCanvas === 'function'
    ? new OffscreenCanvas(width, height)
    : Object.assign(document.createElement('canvas'), { width, height });

const context2d = (canvas: AnyCanvas, readFrequently = false): Ctx2D | null =>
  (canvas as HTMLCanvasElement).getContext('2d', { willReadFrequently: readFrequently }) as Ctx2D | null;

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;

const median = (values: number[]): number => {
  if (!values.length) return 255;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

interface Backdrop {
  rgb: [number, number, number];
  /** Largest per-channel range across the border ring. */
  spread: number;
  uniform: boolean;
}

/**
 * The backdrop is whatever the border ring agrees on. Median rather than mean
 * so a product that runs off one edge cannot drag the estimate with it.
 */
const readBackdrop = (data: Uint8ClampedArray, width: number, height: number): Backdrop => {
  const channels: [number[], number[], number[]] = [[], [], []];
  const push = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    channels[0].push(data[i]);
    channels[1].push(data[i + 1]);
    channels[2].push(data[i + 2]);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
  }

  const rgb = channels.map(median) as [number, number, number];
  // Interquartile range, not min/max: a border the product touches at one point
  // should not be called non-uniform on the strength of that one point.
  const spread = Math.max(
    ...channels.map(channel => {
      const sorted = [...channel].sort((a, b) => a - b);
      const lo = sorted[Math.floor(sorted.length * 0.05)];
      const hi = sorted[Math.floor(sorted.length * 0.95)];
      return hi - lo;
    }),
  );

  return {
    rgb,
    spread,
    uniform: spread <= UNIFORM_SPREAD && Math.min(...rgb) >= MIN_BACKDROP_LEVEL,
  };
};

interface Box { left: number; top: number; right: number; bottom: number }

/** Tightest box containing everything that differs from the backdrop. */
const findContentBox = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bg: [number, number, number],
): Box | null => {
  const rowHits = new Uint32Array(height);
  const colHits = new Uint32Array(width);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const diff = Math.max(
        Math.abs(data[i] - bg[0]),
        Math.abs(data[i + 1] - bg[1]),
        Math.abs(data[i + 2] - bg[2]),
      );
      if (diff > CONTENT_TOLERANCE) {
        rowHits[y]++;
        colHits[x]++;
      }
    }
  }

  const rowFloor = Math.max(1, Math.round(width * ROW_NOISE_FLOOR));
  const colFloor = Math.max(1, Math.round(height * ROW_NOISE_FLOOR));

  let top = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) if (rowHits[y] >= rowFloor) { if (top < 0) top = y; bottom = y; }

  let left = -1;
  let right = -1;
  for (let x = 0; x < width; x++) if (colHits[x] >= colFloor) { if (left < 0) left = x; right = x; }

  if (top < 0 || left < 0) return null;
  return { left, top, right: right + 1, bottom: bottom + 1 };
};

/**
 * Normalise one decoded image. Resolves with `canvas: null` when the image
 * should be stored untouched (a lifestyle photo, or one we could not read).
 */
export const normalizeProductImage = (
  bitmap: ImageBitmap | HTMLImageElement,
  sourceWidth: number,
  sourceHeight: number,
): NormalizeResult => {
  const fallback = (reason: NormalizeResult['reason'], bgColor = '#ffffff', fit: ImageFit = 'contain'): NormalizeResult =>
    ({ canvas: null, bgColor, fit, fillRatio: 1, upscale: 1, reason });

  if (!sourceWidth || !sourceHeight) return fallback('unsupported');

  const ratio = sourceWidth / sourceHeight;
  /** Cropping to the square card is only safe when it throws little away. */
  const cropSafe = 1 - Math.min(ratio, 1 / ratio) <= MAX_COVER_CROP;
  const photograph = (bgColor: string) => fallback('lifestyle', bgColor, cropSafe ? 'cover' : 'contain');

  // --- analyse at a reduced size -------------------------------------------
  const scale = Math.min(1, ANALYSIS_EDGE / Math.max(sourceWidth, sourceHeight));
  const aw = Math.max(1, Math.round(sourceWidth * scale));
  const ah = Math.max(1, Math.round(sourceHeight * scale));

  const probe = makeCanvas(aw, ah);
  const probeCtx = context2d(probe, true);
  if (!probeCtx) return fallback('unsupported');
  probeCtx.drawImage(bitmap as CanvasImageSource, 0, 0, aw, ah);

  let pixels: Uint8ClampedArray;
  try {
    pixels = probeCtx.getImageData(0, 0, aw, ah).data;
  } catch {
    // A cross-origin source taints the canvas; storing it unchanged is correct.
    return fallback('unsupported');
  }

  const backdrop = readBackdrop(pixels, aw, ah);
  const bgColor = toHex(...backdrop.rgb);

  // A photograph, not a sweep: fill the frame where that is safe.
  if (!backdrop.uniform) return photograph(bgColor);

  const box = findContentBox(pixels, aw, ah, backdrop.rgb);
  if (!box) return fallback('no-content', bgColor);

  const boxW = box.right - box.left;
  const boxH = box.bottom - box.top;
  if ((boxW / aw) >= EDGE_TO_EDGE && (boxH / ah) >= EDGE_TO_EDGE) {
    return photograph(bgColor);
  }

  // --- map the box back to full resolution ---------------------------------
  const inv = 1 / scale;
  const cropX = Math.max(0, Math.floor(box.left * inv));
  const cropY = Math.max(0, Math.floor(box.top * inv));
  const cropW = Math.min(sourceWidth - cropX, Math.ceil(boxW * inv));
  const cropH = Math.min(sourceHeight - cropY, Math.ceil(boxH * inv));
  if (cropW < 2 || cropH < 2) return fallback('no-content', bgColor);

  // --- place it on the canonical square ------------------------------------
  const safe = CANVAS * (1 - 2 * MARGIN);
  const fitScale = Math.min(safe / cropW, safe / cropH);
  const upscale = Math.min(fitScale, MAX_UPSCALE);
  const drawW = Math.max(1, Math.round(cropW * upscale));
  const drawH = Math.max(1, Math.round(cropH * upscale));

  const out = makeCanvas(CANVAS, CANVAS);
  const ctx = context2d(out);
  if (!ctx) return fallback('unsupported', bgColor);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CANVAS, CANVAS);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    bitmap as CanvasImageSource,
    cropX, cropY, cropW, cropH,
    Math.round((CANVAS - drawW) / 2), Math.round((CANVAS - drawH) / 2), drawW, drawH,
  );

  return {
    canvas: out,
    bgColor,
    fit: 'contain',
    fillRatio: (drawW * drawH) / (CANVAS * CANVAS),
    upscale,
    reason: 'normalised',
  };
};

/** Below this the source is mostly empty and worth re-shooting; the admin warns. */
export const LOW_FILL_WARNING = 0.18;
/** Above this we magnified enough that the card will look soft. */
export const SOFT_UPSCALE_WARNING = 1.6;

export const normalizeConstants = { CANVAS, MARGIN, MAX_UPSCALE } as const;

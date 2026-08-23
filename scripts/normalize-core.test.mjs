// Checks scripts/normalize-core.mjs against the shapes actually found in the
// catalogue: tall products padded out to a square by the supplier, wide jars,
// grey studio sweeps, low-resolution sources, and lifestyle photographs.
//
//   node scripts/normalize-core.test.mjs

import sharp from 'sharp';
import { constants, normalize } from './normalize-core.mjs';

const { CANVAS, MARGIN, MAX_UPSCALE } = constants;
const SAFE = CANVAS * (1 - 2 * MARGIN);

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/** A solid rectangle of `colour` centred on a `bg` canvas. */
const swatch = async ({ w, h, pw, ph, bg, fg = { r: 20, g: 40, b: 90 } }) => {
  const product = await sharp({ create: { width: pw, height: ph, channels: 3, background: fg } })
    .png().toBuffer();
  return sharp({ create: { width: w, height: h, channels: 3, background: bg } })
    .composite([{ input: product, left: Math.round((w - pw) / 2), top: Math.round((h - ph) / 2) }])
    .webp().toBuffer();
};

const describe = async buffer => {
  const meta = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // Measure the drawn product back out of the result.
  const bg = [data[0], data[1], data[2]];
  let top = -1, bottom = -1, left = -1, right = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      const d = Math.max(Math.abs(data[i] - bg[0]), Math.abs(data[i + 1] - bg[1]), Math.abs(data[i + 2] - bg[2]));
      if (d > 18) {
        if (top < 0) top = y;
        bottom = y;
        if (left < 0 || x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  return { w: meta.width, h: meta.height, pw: right - left + 1, ph: bottom - top + 1, bg };
};

// 1. The dominant case: a tall product the supplier padded out to a square.
//    Measured across the live catalogue as ~31% dead margin left and right.
{
  const src = await swatch({ w: 1200, h: 1200, pw: 380, ph: 1100, bg: { r: 255, g: 255, b: 255 } });
  const r = await normalize(src);
  check('tall-in-square: re-framed', r.reason === 'normalised', r.reason);
  check('tall-in-square: output is a 1200 square',
    !!r.buffer && (await describe(r.buffer)).w === CANVAS);
  const out = await describe(r.buffer);
  check('tall-in-square: product fills the safe height',
    near(out.ph, SAFE, 4), `${out.ph}px vs ${SAFE}px`);
  check('tall-in-square: backdrop preserved as white', r.bgColor === '#ffffff', r.bgColor);
}

// 2. A wide flat jar. Width-limited, so it must be shorter than a tall bottle —
//    that difference is real and should survive normalisation.
{
  const src = await swatch({ w: 1200, h: 900, pw: 1000, ph: 420, bg: { r: 255, g: 255, b: 255 } });
  const r = await normalize(src);
  const out = await describe(r.buffer);
  check('wide jar: width-limited to the safe box', near(out.pw, SAFE, 4), `${out.pw}px`);
  check('wide jar: renders shorter than a tall bottle', out.ph < SAFE * 0.75, `${out.ph}px`);
}

// 3. Grey studio sweep — kept, never lifted to white, and reported so the card
//    can paint a matching frame.
{
  const src = await swatch({ w: 1000, h: 1000, pw: 300, ph: 800, bg: { r: 225, g: 225, b: 225 } });
  const r = await normalize(src);
  check('grey sweep: re-framed', r.reason === 'normalised', r.reason);
  check('grey sweep: backdrop reported', r.bgColor === '#e1e1e1', r.bgColor);
  const out = await describe(r.buffer);
  check('grey sweep: padding matches the backdrop',
    out.bg[0] === 225 && out.bg[1] === 225 && out.bg[2] === 225, out.bg.join(','));
}

// 4. Low-resolution source must not be magnified past the cap, even though that
//    leaves it smaller than its neighbours. Sharp beats uniform.
{
  const src = await swatch({ w: 300, h: 300, pw: 100, ph: 220, bg: { r: 255, g: 255, b: 255 } });
  const r = await normalize(src);
  check('low-res: upscale capped', r.upscale <= MAX_UPSCALE + 0.001, `x${r.upscale?.toFixed(2)}`);
  const out = await describe(r.buffer);
  check('low-res: lands below the safe height', out.ph < SAFE, `${out.ph}px vs ${SAFE}px`);
}

// 5. A photograph — non-uniform backdrop — is left alone and marked to crop.
{
  const noisy = Buffer.alloc(600 * 600 * 3);
  for (let i = 0; i < noisy.length; i += 3) {
    const v = (i / 3) % 600;
    noisy[i] = 40 + (v % 180); noisy[i + 1] = 90; noisy[i + 2] = 150 - (v % 120);
  }
  const src = await sharp(noisy, { raw: { width: 600, height: 600, channels: 3 } }).webp().toBuffer();
  const r = await normalize(src);
  check('photograph: not re-framed', r.buffer === null, r.reason);
  check('photograph: marked to crop', r.fit === 'cover', r.fit);
}

// 5b. A tall photograph must NOT crop to square — that would slice the product.
{
  const noisy = Buffer.alloc(600 * 900 * 3);
  for (let i = 0; i < noisy.length; i += 3) {
    const v = (i / 3) % 600;
    noisy[i] = 40 + (v % 180); noisy[i + 1] = 90; noisy[i + 2] = 150 - (v % 120);
  }
  const src = await sharp(noisy, { raw: { width: 600, height: 900, channels: 3 } }).webp().toBuffer();
  const r = await normalize(src);
  check('tall photograph: letterboxes instead of cropping', r.fit === 'contain', r.fit);
}

// 6. A dark backdrop is a photograph too, not a sweep to pad against.
{
  const src = await swatch({ w: 800, h: 800, pw: 300, ph: 600, bg: { r: 60, g: 55, b: 50 }, fg: { r: 240, g: 240, b: 240 } });
  const r = await normalize(src);
  check('dark backdrop: treated as a photograph', r.buffer === null && r.reason === 'lifestyle', `${r.reason}/${r.fit}`);
}

// 7. Idempotence: re-running on an already-normalised file changes nothing.
{
  const src = await swatch({ w: 1200, h: 1200, pw: 380, ph: 1100, bg: { r: 255, g: 255, b: 255 } });
  const once = await normalize(src);
  const twice = await normalize(once.buffer);
  const a = await describe(once.buffer);
  const b = await describe(twice.buffer);
  check('idempotent: size unchanged on a second pass',
    near(a.ph, b.ph, 3) && near(a.pw, b.pw, 3), `${a.pw}x${a.ph} -> ${b.pw}x${b.ph}`);
}

// 8. An edge-to-edge image has no dead space to reclaim; cropping to fill is right.
{
  const src = await swatch({ w: 800, h: 800, pw: 800, ph: 800, bg: { r: 255, g: 255, b: 255 } });
  const r = await normalize(src);
  check('edge-to-edge: marked to crop', r.fit === 'cover', `${r.reason}/${r.fit}`);
}

console.log(failures ? `\n${failures} failing check(s)` : '\nAll checks passed');
process.exit(failures ? 1 : 0);

// Pre-requests every image transform the storefront can ask for, so the CDN is
// warm before a shopper arrives.
//
//   node scripts/warm-images.mjs
//   node scripts/warm-images.mjs --concurrency 8
//
// A transform nobody has requested yet costs ~2.5 s at the origin. Changing the
// URL scheme (adding height/resize on 24 Aug) made every existing transform
// cold at once, which is what "images feel slower" was. New uploads are warmed
// by the media function; this covers everything already in the bucket.
//
// No credentials: it only reads public rows and fetches public URLs. The width
// ladder must match IMAGE_WIDTHS in lib/image-url.ts.

import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const flags = process.argv.slice(2);
const concurrency = Number(flags[flags.indexOf('--concurrency') + 1]) || 12;

const PRODUCT_WIDTHS = [160, 320, 640, 1200];
const COMPOSITION_WIDTHS = [320, 640, 1200, 1600];
const QUALITY = 75;
const OBJECT = '/storage/v1/object/public/';
const RENDER = '/storage/v1/render/image/public/';

const rest = async (path) => {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
};

const transform = (url, w, resize) =>
  `${url.split('?')[0].replace(OBJECT, RENDER)}?width=${w}&height=${w}&resize=${resize}&quality=${QUALITY}`;

const targets = new Set();
const ours = (u) => typeof u === 'string' && u.includes(OBJECT);

const products = await rest('products?select=images');
for (const p of products) {
  for (const img of p.images || []) {
    if (!ours(img?.url)) continue;
    const resize = img.fit === 'cover' ? 'cover' : 'contain';
    for (const w of PRODUCT_WIDTHS) targets.add(transform(img.url, w, resize));
  }
}

const compositions = [];
for (const b of await rest('brands?select=image')) compositions.push(b.image);
for (const c of await rest('categories?select=image')) compositions.push(c.image);
for (const row of await rest('site_content?select=key,content')) {
  const c = row.content || {};
  if (c.image) compositions.push(c.image);
  if (Array.isArray(c.images)) compositions.push(...c.images);
  if (Array.isArray(c)) compositions.push(...c.map(x => x?.image));
}
for (const u of compositions) {
  if (!ours(u)) continue;
  for (const w of COMPOSITION_WIDTHS) targets.add(transform(u, w, 'contain'));
}

const list = [...targets];
console.log(`${list.length} transforms to warm (${products.length} products), concurrency ${concurrency}`);

let done = 0, cold = 0, failed = 0;
const started = Date.now();
const worker = async () => {
  while (list.length) {
    const url = list.shift();
    const t0 = Date.now();
    try {
      const res = await fetch(url, { headers: { Accept: 'image/avif,image/webp,*/*' } });
      await res.arrayBuffer();
      if (!res.ok) failed++;
      else if (Date.now() - t0 > 500) cold++;
    } catch {
      failed++;
    }
    done++;
    if (done % 100 === 0) console.log(`  ${done} done, ${cold} were cold, ${failed} failed`);
  }
};
await Promise.all(Array.from({ length: concurrency }, worker));
console.log(`\nwarmed ${done} in ${((Date.now() - started) / 1000).toFixed(0)}s — ${cold} were cold before this run, ${failed} failed`);

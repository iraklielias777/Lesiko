// Re-frames every product photo already in the catalogue onto the canonical
// square, the same way lib/image-normalize.ts does for new uploads.
//
//   node scripts/normalize-images.mjs <admin-email> <admin-password> --dry-run
//   node scripts/normalize-images.mjs <admin-email> <admin-password>
//   node scripts/normalize-images.mjs <admin-email> <admin-password> --slug <product-slug>
//   node scripts/normalize-images.mjs <admin-email> <admin-password> --limit 20 --keep-old
//
// Idempotent and resumable: an image whose row already carries `bgColor` has
// been processed, and is skipped unless --force is passed. Safe to re-run after
// an interruption.
//
// The re-framing itself lives in scripts/normalize-core.mjs, which mirrors
// lib/image-normalize.ts so a backfilled image and a freshly uploaded one land
// identically.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { LOW_FILL_WARNING, SOFT_UPSCALE_WARNING, normalize } from './normalize-core.mjs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const [, , email, password, ...flags] = process.argv;
const dryRun = flags.includes('--dry-run');
const force = flags.includes('--force');
const keepOld = flags.includes('--keep-old');
const slugIdx = flags.indexOf('--slug');
const onlySlug = slugIdx >= 0 ? flags[slugIdx + 1] : null;
const limitIdx = flags.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(flags[limitIdx + 1]) : Infinity;

if (!email || !password) {
  console.error(
    'usage: node scripts/normalize-images.mjs <admin-email> <admin-password> [--dry-run] [--force] [--keep-old] [--slug <slug>] [--limit <n>]',
  );
  process.exit(1);
}

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});

const { error: authError } = await sb.auth.signInWithPassword({ email, password });
if (authError) {
  console.error('Sign-in failed:', authError.message);
  process.exit(1);
}

// --------------------------------------------------------------------- work
let query = sb.from('products').select('id, name, slug, images, variants').order('created_at');
if (onlySlug) query = query.eq('slug', onlySlug);

const { data: products, error: readError } = await query;
if (readError) {
  console.error('Could not read products:', readError.message);
  process.exit(1);
}

const ours = url => typeof url === 'string' && url.includes('/media/');
const pathOf = url => url.split('/media/')[1]?.split('?')[0];

const targets = products
  .map(p => ({
    ...p,
    pending: (p.images || []).filter(img => ours(img?.url) && (force || !img.bgColor)),
  }))
  .filter(p => p.pending.length)
  .slice(0, limit);

const external = products.flatMap(p => (p.images || []).filter(i => i?.url && !ours(i.url)));

console.log(`${products.length} products, ${targets.length} with images to process.`);
if (external.length) {
  console.log(`${external.length} image(s) hosted off-site are skipped (demo seed — run purge-demo.mjs).`);
}
if (!targets.length) {
  console.log('Nothing to do.');
  process.exit(0);
}

if (!dryRun) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `\nRe-frame ${targets.reduce((n, p) => n + p.pending.length, 0)} image(s)` +
    `${keepOld ? '' : ' and delete the originals'}? Type "go" to confirm: `,
  );
  rl.close();
  if (answer.trim() !== 'go') { console.log('Aborted.'); process.exit(0); }
}

const stats = { normalised: 0, lifestyle: 0, skipped: 0, failed: 0, weak: [], soft: [] };

for (const product of targets) {
  const replacements = new Map();
  let images = [...(product.images || [])];

  for (const image of product.pending) {
    let report;
    try {
      const res = await fetch(image.url);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      report = await normalize(Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      console.warn(`  ! ${product.slug}: ${e.message}`);
      stats.failed++;
      continue;
    }

    const label = `${product.slug.slice(0, 42).padEnd(42)}`;

    if (!report.buffer) {
      // Nothing to re-frame, but the backdrop and fit are still worth storing:
      // that is what lets the card paint a seamless frame.
      images = images.map(i => (i.id === image.id ? { ...i, bgColor: report.bgColor, fit: report.fit } : i));
      stats[report.reason === 'lifestyle' ? 'lifestyle' : 'skipped']++;
      console.log(`  ${dryRun ? '[dry] ' : ''}${label} ${report.reason.padEnd(11)} bg ${report.bgColor}`);
      continue;
    }

    const fillPct = Math.round(report.fillRatio * 100);
    const notes = [];
    if (report.fillRatio < LOW_FILL_WARNING) { notes.push('small in frame'); stats.weak.push(product.slug); }
    if (report.upscale >= SOFT_UPSCALE_WARNING) { notes.push('low-res, magnified'); stats.soft.push(product.slug); }
    console.log(
      `  ${dryRun ? '[dry] ' : ''}${label} re-framed   bg ${report.bgColor}  fill ${String(fillPct).padStart(2)}%  ` +
      `x${report.upscale.toFixed(2)}  ${(report.buffer.length / 1024).toFixed(0)}KB` +
      (notes.length ? `  <- ${notes.join(', ')}` : ''),
    );

    if (dryRun) { stats.normalised++; continue; }

    const form = new FormData();
    form.append('file', new Blob([report.buffer], { type: 'image/webp' }), 'normalised.webp');
    form.append('folder', 'products');

    const { data: uploaded, error: uploadError } = await sb.functions.invoke('media', { body: form });
    if (uploadError || !uploaded?.publicUrl) {
      console.warn(`  ! ${product.slug}: upload failed — ${uploadError?.message || 'no url'}`);
      stats.failed++;
      continue;
    }

    replacements.set(image.url, uploaded.publicUrl);
    images = images.map(i =>
      i.id === image.id
        ? { ...i, url: uploaded.publicUrl, bgColor: report.bgColor, fit: report.fit }
        : i,
    );
    stats.normalised++;
  }

  if (dryRun) continue;

  // Variants point at gallery images by URL, so they have to follow the swap.
  const variants = (product.variants || []).map(v =>
    v?.imageUrl && replacements.has(v.imageUrl) ? { ...v, imageUrl: replacements.get(v.imageUrl) } : v,
  );

  const { error: writeError } = await sb
    .from('products')
    .update({ images, variants })
    .eq('id', product.id);

  if (writeError) {
    console.warn(`  ! ${product.slug}: row update failed — ${writeError.message}`);
    stats.failed++;
    continue;
  }

  // Only once the row points at the new files is the old one safe to remove.
  if (!keepOld) {
    for (const oldUrl of replacements.keys()) {
      const path = pathOf(oldUrl);
      if (!path) continue;
      const { error } = await sb.functions.invoke('media', { body: { action: 'delete', path } });
      if (error) console.warn(`  ! could not delete ${path}: ${error.message}`);
    }
  }
}

console.log(
  `\n${dryRun ? 'Dry run — nothing written.\n' : ''}` +
  `re-framed ${stats.normalised}   left as shot ${stats.lifestyle}   no content ${stats.skipped}   failed ${stats.failed}`,
);
if (stats.weak.length) {
  console.log(`\n${stats.weak.length} photo(s) where the product is small in frame — a tighter shot would render larger:`);
  console.log('  ' + [...new Set(stats.weak)].join('\n  '));
}
if (stats.soft.length) {
  console.log(`\n${stats.soft.length} photo(s) magnified past ${SOFT_UPSCALE_WARNING}x — these will look soft, worth re-sourcing:`);
  console.log('  ' + [...new Set(stats.soft)].join('\n  '));
}

// Removes the demo catalogue seeded by migrations 0004 and 0012, along with
// any storage objects those products reference. Run this once, right before
// real inventory goes in.
//
//   node scripts/purge-demo.mjs <admin-email> <admin-password>
//   node scripts/purge-demo.mjs <admin-email> <admin-password> --dry-run
//
// Only rows tagged 'demo' are touched, so anything the admin has created
// through the panel survives. Storage deletes go through the media Edge
// Function because storage.objects is not writable with the publishable key.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

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

if (!email || !password) {
  console.error('usage: node scripts/purge-demo.mjs <admin-email> <admin-password> [--dry-run]');
  process.exit(1);
}

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false }
});

const { error: authError } = await sb.auth.signInWithPassword({ email, password });
if (authError) {
  console.error('Sign-in failed:', authError.message);
  process.exit(1);
}

const { data: demo, error: readError } = await sb
  .from('products')
  .select('id, name, slug, images')
  .contains('tags', ['demo']);

if (readError) {
  console.error('Could not read demo products:', readError.message);
  process.exit(1);
}

if (!demo.length) {
  console.log('No products tagged "demo". Nothing to do.');
  process.exit(0);
}

// Only objects in our own bucket are ours to delete; the seed also references
// images hosted on Unsplash, which are not.
const storagePaths = [...new Set(
  demo
    .flatMap(p => p.images || [])
    .map(img => img?.url)
    .filter(url => typeof url === 'string' && url.includes('/media/'))
    .map(url => url.split('/media/')[1]?.split('?')[0])
    .filter(Boolean)
)];

console.log(`${demo.length} demo products:`);
for (const p of demo) console.log(`  - ${p.name} (${p.slug})`);
console.log(`${storagePaths.length} storage object(s) to remove.`);

if (dryRun) {
  console.log('\nDry run — nothing deleted.');
  process.exit(0);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = await rl.question('\nDelete these permanently? Type "purge" to confirm: ');
rl.close();

if (answer.trim() !== 'purge') {
  console.log('Aborted.');
  process.exit(0);
}

for (const path of storagePaths) {
  const { error } = await sb.functions.invoke('media', { body: { action: 'delete', path } });
  if (error) console.warn(`  ! could not delete ${path}: ${error.message}`);
}

// order_items.product_id is ON DELETE SET NULL and the line keeps its own
// product_name and price, so past orders stay readable after the purge.
const ids = demo.map(p => p.id);
const { error: deleteError } = await sb.from('products').delete().in('id', ids);
if (deleteError) {
  console.error('Delete failed:', deleteError.message);
  process.exit(1);
}

console.log(`\nRemoved ${demo.length} demo products and ${storagePaths.length} storage object(s).`);

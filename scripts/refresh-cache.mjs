// Rewrite every stored image that still carries the old one-hour cache header.
//
//   node scripts/refresh-cache.mjs <admin-email> <admin-password>
//
// Objects uploaded before the media function switched to a one-year header
// are re-fetched by every returning browser after an hour, and the render
// endpoint inherits the header, so their resized variants expire just as fast.
// The header lives on the stored object, so the media function writes the same
// bytes back to the same path with the new value; no URL changes and no row
// needs repointing. Safe to run again: objects already on a year are skipped.

import { createClient } from '@supabase/supabase-js';
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

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error('usage: node scripts/refresh-cache.mjs <admin-email> <admin-password>');
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

const { data, error } = await sb.functions.invoke('media', { body: { action: 'refresh-cache' } });
if (error) {
  console.error('refresh-cache failed:', error.message);
  process.exit(1);
}

console.log(`refreshed ${data.refreshed} object(s)`);
for (const f of data.failed || []) console.log(`  failed ${f.name}: ${f.error}`);

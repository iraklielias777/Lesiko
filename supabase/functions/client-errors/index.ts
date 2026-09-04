// Vendor-free error tracking.
//
// The storefront posts an uncaught JavaScript error here (lib/error-reporting.ts)
// and it lands in `ops_alerts`, the same list the payments function writes to,
// so a shopper hitting a broken page shows up on the admin dashboard next to a
// failed payment — no Sentry account, no third-party script in the CSP.
//
// The endpoint is public by necessity, so it is deliberately dull to abuse:
// short, typed fields only; one alert per (message, path) per day; a few per
// address per hour; a global ceiling; and it always answers 204 so nothing can
// be learned from it. Deploy with verify_jwt disabled.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const KIND = 'client_error';
const PER_ADDRESS_PER_HOUR = 5;
const GLOBAL_PER_HOUR = 60;
const DEDUPE_HOURS = 24;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const done = () => new Response(null, { status: 204, headers: CORS });

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const fingerprintOf = async (message: string, path: string) => {
  const bytes = new TextEncoder().encode(`${message}|${path}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
};

const sinceIso = (hours: number) => new Date(Date.now() - hours * 3600 * 1000).toISOString();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return done();

    const message = text(body.message, 300);
    const path = text(body.path, 200) || '/';
    if (!message) return done();

    const stack = text(body.stack, 2000);
    const userAgent = text(body.userAgent, 200);
    const url = text(body.url, 500);
    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 64);
    const fingerprint = await fingerprintOf(message, path);

    // Same error on the same page in the last day: the operator already knows.
    const { count: seen } = await admin
      .from('ops_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('kind', KIND)
      .eq('context->>fingerprint', fingerprint)
      .gte('created_at', sinceIso(DEDUPE_HOURS));
    if ((seen ?? 0) > 0) return done();

    const hourAgo = sinceIso(1);
    const [{ count: fromAddress }, { count: total }] = await Promise.all([
      admin.from('ops_alerts').select('id', { count: 'exact', head: true })
        .eq('kind', KIND).eq('context->>ip', ip).gte('created_at', hourAgo),
      admin.from('ops_alerts').select('id', { count: 'exact', head: true })
        .eq('kind', KIND).gte('created_at', hourAgo),
    ]);
    if ((fromAddress ?? 0) >= PER_ADDRESS_PER_HOUR || (total ?? 0) >= GLOBAL_PER_HOUR) return done();

    await admin.from('ops_alerts').insert({
      kind: KIND,
      severity: 'warning',
      message: `A shopper hit an error on ${path}: ${message}`,
      context: { fingerprint, path, url, stack, userAgent, ip },
    });
  } catch (e) {
    console.error('client-errors failed', e);
  }
  return done();
});

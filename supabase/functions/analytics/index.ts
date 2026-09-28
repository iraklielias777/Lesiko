// Anonymous storefront counts. The browser posts a small batch; this function
// writes daily totals only. Purchases are recorded by the payments function.
// Deploy with verify_jwt disabled.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ALLOWED = new Set(['view_item', 'view_category', 'add_to_cart', 'begin_checkout', 'search']);
const MAX_BATCH = 20;
const PER_IP_PER_MINUTE = 30;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const hits = new Map<string, number[]>();
const allow = (ip: string) => {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60_000);
  if (recent.length >= PER_IP_PER_MINUTE) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
};

const bot = (ua: string) => /bot|crawl|spider|preview|headless/i.test(ua);

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const done = (status = 204) => new Response(null, { status, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return done();
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  const ua = req.headers.get('user-agent') || '';
  if (bot(ua)) return done();

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (!allow(ip)) return done(429);

  const body = await req.json().catch(() => null);
  const session = text(body?.session, 80);
  const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_BATCH) : [];
  if (!session || events.length === 0) return done();

  for (const raw of events) {
    if (!raw || typeof raw !== 'object') continue;
    const event = text(raw.event, 32);
    if (!ALLOWED.has(event)) continue;
    const productId = text(raw.productId, 40);
    const category = text(raw.category, 80);
    const search = text(raw.search, 80);
    if (search.includes('@')) continue;
    const { error } = await admin.rpc('record_store_event', {
      p_event: event,
      p_session: session,
      p_product_id: /^[0-9a-f-]{36}$/i.test(productId) ? productId : null,
      p_category: category || null,
      p_search: search || null,
      p_count: 1,
    });
    if (error) console.error('record_store_event', error.message);
  }

  return done();
});

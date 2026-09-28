// Signs a short-lived identity token for the Recall chat widget.
// The identity secret never leaves this function. Deploy with verify_jwt off;
// only a signed-in shopper's own session is accepted.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const IDENTITY_SECRET = (Deno.env.get('RECALL_IDENTITY_SECRET') || '').trim();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const signJwt = async (payload: Record<string, unknown>, secret: string) => {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(new Uint8Array(sig))}`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!IDENTITY_SECRET) return json({ error: 'Chat identity is not configured' }, 503);

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token || token === ANON_KEY || token === SERVICE_ROLE_KEY) {
    return json({ error: 'Sign in required' }, 401);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: 'Sign in required' }, 401);

  const { data: profile } = await admin
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle();

  const { data: address } = await admin
    .from('addresses')
    .select('phone')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle();

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();
  const email = (profile?.email || user.email || '').trim();
  const phone = String(address?.phone || '').trim();
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    sub: user.id,
    iat: now,
    exp: now + 12 * 60 * 60,
  };
  if (name) claims.name = name;
  if (email) claims.email = email;
  if (phone) claims.phone = phone;

  const identity = await signJwt(claims, IDENTITY_SECRET);
  return json({ token: identity });
});

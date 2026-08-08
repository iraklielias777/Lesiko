// Flitt payment gateway bridge.
//
// create-token  — signs POST /api/checkout/token so the browser never sees the
//                 payment secret. Amount always comes from the pending order row.
// callback      — Flitt host-to-host notification; verifies signature, marks paid.
// order-status  — confirmation polling for guests; requires orderId + publicToken
//                 (RLS blocks anon SELECT on orders).
// lookup        — guest track-order via order number + email.
//
// Deploy with verify_jwt disabled: callback has no JWT; create-token /
// order-status / lookup enforce their own checks.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const encodeHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const FLITT_MERCHANT_ID = Deno.env.get('FLITT_MERCHANT_ID') ?? '';
const FLITT_SECRET_KEY = Deno.env.get('FLITT_SECRET_KEY') ?? '';
const SITE_URL_ENV = (Deno.env.get('SITE_URL') ?? '').replace(/\/+$/, '');
const FLITT_API = 'https://pay.flitt.com/api/checkout/token';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

/**
 * Flitt signature: sha1(secret|v1|v2|…) over non-empty params sorted by key.
 * Empty strings are omitted; numeric 0 must stay ("0").
 */
const sha1Hex = async (payload: string): Promise<string> => {
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-1', data);
  return encodeHex(new Uint8Array(digest));
};

const buildSignature = async (
  params: Record<string, unknown>,
  secret: string,
): Promise<string> => {
  const parts = Object.keys(params)
    .filter((key) => {
      if (key === 'signature' || key === 'response_signature_string') return false;
      const value = params[key];
      return value !== undefined && value !== null && String(value) !== '';
    })
    .sort()
    .map((key) => String(params[key]));

  return sha1Hex([secret, ...parts].join('|'));
};

const verifySignature = async (
  params: Record<string, unknown>,
  secret: string,
): Promise<boolean> => {
  const provided = String(params.signature ?? '');
  if (!provided) return false;
  const expected = await buildSignature(params, secret);
  return expected === provided.toLowerCase();
};

const resolveSiteUrl = async (): Promise<string> => {
  if (SITE_URL_ENV) return SITE_URL_ENV;
  const { data } = await admin
    .from('site_content')
    .select('content')
    .eq('key', 'store_settings')
    .maybeSingle();
  const fromSettings = String(data?.content?.siteUrl ?? '').replace(/\/+$/, '');
  return fromSettings;
};

const loadStoreSettings = async (): Promise<{
  currency: string;
  taxRate: number;
  freeShippingThreshold: number;
  shippingRate: number;
}> => {
  const { data } = await admin
    .from('site_content')
    .select('content')
    .eq('key', 'store_settings')
    .maybeSingle();
  const content = (data?.content ?? {}) as Record<string, unknown>;
  return {
    currency: String(content.currency || 'GEL').toUpperCase(),
    taxRate: Number(content.taxRate ?? 0.08),
    freeShippingThreshold: Number(content.freeShippingThreshold ?? 50),
    shippingRate: Number(content.shippingRate ?? 15),
  };
};

class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockError';
  }
}

const variantInventory = (variant: Record<string, unknown> | undefined): number | null => {
  if (!variant) return null;
  const raw = variant.inventoryQuantity ?? variant.inventory_quantity;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const availableStock = (
  product: { inventory_quantity?: number | null; variants?: unknown },
  variantName?: string | null,
): number => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variantName) {
    const match = variants.find(
      (v: { name?: string }) => v?.name === variantName,
    ) as Record<string, unknown> | undefined;
    const fromVariant = variantInventory(match);
    if (fromVariant != null) return Math.max(0, fromVariant);
  }
  return Math.max(0, Number(product.inventory_quantity ?? 0));
};

/**
 * Reprice order lines from live catalogue sell prices (sale `price`, not
 * compare_at), then recompute shipping/tax the same way as the storefront.
 * Rejects lines that exceed available stock.
 */
const repriceOrder = async (orderId: string): Promise<{
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}> => {
  const { data: items, error: itemsError } = await admin
    .from('order_items')
    .select('id, product_id, variant_name, quantity, product_name')
    .eq('order_id', orderId);

  if (itemsError) throw itemsError;
  if (!items?.length) {
    throw new Error('Order has no line items');
  }

  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
  const { data: products, error: productsError } = await admin
    .from('products')
    .select('id, price, inventory_quantity, variants')
    .in('id', productIds);

  if (productsError) throw productsError;

  const byId = new Map((products || []).map((p) => [p.id, p]));
  let subtotal = 0;

  for (const item of items) {
    const product = byId.get(item.product_id);
    if (!product) {
      throw new Error(`Product ${item.product_id} is no longer available`);
    }

    const qty = Number(item.quantity) || 0;
    const stock = availableStock(product, item.variant_name);
    if (qty > stock) {
      throw new StockError(
        `Insufficient stock for ${item.product_name || item.product_id} (need ${qty}, have ${stock})`,
      );
    }

    let unit = Number(product.price);
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (item.variant_name) {
      const match = variants.find(
        (v: { name?: string; price?: number }) => v?.name === item.variant_name,
      );
      if (match?.price != null && Number.isFinite(Number(match.price))) {
        unit = Number(match.price);
      }
    }

    if (!Number.isFinite(unit) || unit < 0) {
      throw new Error(`Invalid price for product ${item.product_id}`);
    }

    const { error: lineError } = await admin
      .from('order_items')
      .update({ price: unit })
      .eq('id', item.id);
    if (lineError) throw lineError;

    subtotal += unit * qty;
  }

  // Round money to cents/tetri before shipping/tax so Flitt minor units match.
  subtotal = Math.round(subtotal * 100) / 100;

  const settings = await loadStoreSettings();
  const shipping =
    subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingRate;
  const tax = Math.round(subtotal * settings.taxRate * 100) / 100;
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;

  const { error: orderError } = await admin
    .from('orders')
    .update({ subtotal, shipping, tax, total })
    .eq('id', orderId);
  if (orderError) throw orderError;

  return { subtotal, shipping, tax, total };
};

const parseBody = async (req: Request): Promise<Record<string, unknown>> => {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return {};
    // Flitt sometimes wraps the payload as { response: { ... } }.
    const nested = (body as { response?: unknown }).response;
    if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
    return body as Record<string, unknown>;
  }
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await req.formData();
    const out: Record<string, unknown> = {};
    for (const [key, value] of form.entries()) {
      out[key] = typeof value === 'string' ? value : value.name;
    }
    return out;
  }
  // Last resort: try JSON, then form text.
  const text = await req.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (parsed?.response && typeof parsed.response === 'object') return parsed.response;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    /* fall through */
  }
  const params = new URLSearchParams(text);
  return Object.fromEntries(params.entries());
};

const createToken = async (req: Request): Promise<Response> => {
  if (!FLITT_MERCHANT_ID || !FLITT_SECRET_KEY) {
    return json({ error: 'Flitt is not configured on the server' }, 503);
  }

  const body = await parseBody(req);
  const orderId = String(body.orderId ?? '');
  if (!orderId) return json({ error: 'orderId is required' }, 400);

  const { data: order, error } = await admin
    .from('orders')
    .select('id, order_number, customer_email, payment_status, total, flitt_order_id')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) return json({ error: 'Order not found' }, 404);
  if (order.payment_status === 'paid') {
    return json({ error: 'Order is already paid' }, 409);
  }
  if (order.payment_status === 'failed') {
    // Allow retry by resetting to pending when minting a fresh token.
    await admin.from('orders').update({ payment_status: 'pending' }).eq('id', orderId);
  }

  const siteUrl = await resolveSiteUrl();
  if (!siteUrl) {
    return json({
      error: 'SITE_URL is not configured. Set the edge secret or Admin → SEO site address.',
    }, 503);
  }

  let priced: { subtotal: number; shipping: number; tax: number; total: number };
  try {
    priced = await repriceOrder(orderId);
  } catch (err) {
    console.error('repriceOrder failed', err);
    const status = err instanceof StockError ? 409 : 400;
    return json({
      error: err instanceof Error ? err.message : 'Could not reprice order',
    }, status);
  }

  const settings = await loadStoreSettings();
  const currency = settings.currency;
  const amount = Math.round(priced.total * 100);
  if (!Number.isFinite(amount) || amount <= 0) {
    return json({ error: 'Order total is not payable' }, 400);
  }

  const flittOrderId = order.flitt_order_id || order.order_number;
  const langHeader = String(body.lang ?? 'en').toLowerCase();
  const lang = langHeader.startsWith('ka') ? 'ka' : 'en';

  const requestParams: Record<string, unknown> = {
    order_id: flittOrderId,
    merchant_id: Number(FLITT_MERCHANT_ID),
    order_desc: `LesiKo order ${order.order_number}`,
    amount,
    currency,
    response_url: `${siteUrl}/order-confirmation?order=${order.id}`,
    server_callback_url: `${SUPABASE_URL}/functions/v1/payments/callback`,
    sender_email: order.customer_email,
    lang,
  };
  requestParams.signature = await buildSignature(requestParams, FLITT_SECRET_KEY);

  await admin
    .from('orders')
    .update({
      flitt_order_id: flittOrderId,
      payment_status: 'pending',
    })
    .eq('id', orderId);

  let flittRes: Response;
  try {
    flittRes = await fetch(FLITT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: requestParams }),
    });
  } catch {
    return json({ error: 'Could not reach Flitt' }, 502);
  }

  const flittJson = await flittRes.json().catch(() => null);
  const response = flittJson?.response ?? flittJson;
  if (!response || response.response_status !== 'success' || !response.token) {
    console.error('Flitt create-token failed', response);
    return json({
      error: response?.error_message || 'Flitt rejected the payment token request',
      detail: response?.error_code,
    }, 502);
  }

  return json({
    token: response.token,
    orderId: order.id,
    orderNumber: order.order_number,
    amount,
    currency,
    total: priced.total,
    subtotal: priced.subtotal,
    shipping: priced.shipping,
    tax: priced.tax,
  });
};

const handleCallback = async (req: Request): Promise<Response> => {
  if (!FLITT_SECRET_KEY) {
    return json({ error: 'Flitt is not configured' }, 503);
  }

  const payload = await parseBody(req);
  if (!(await verifySignature(payload, FLITT_SECRET_KEY))) {
    console.error('Flitt callback signature mismatch', {
      order_id: payload.order_id,
      order_status: payload.order_status,
    });
    // Still 200 so Flitt does not hammer retries for forever — but we do not
    // mutate state. Operators can inspect logs.
    return new Response('invalid signature', { status: 200 });
  }

  const flittOrderId = String(payload.order_id ?? '');
  if (!flittOrderId) return new Response('ok', { status: 200 });

  const { data: order } = await admin
    .from('orders')
    .select('id, payment_status')
    .eq('flitt_order_id', flittOrderId)
    .maybeSingle();

  if (!order) {
    // Fallback: some early rows may only match on order_number.
    const { data: byNumber } = await admin
      .from('orders')
      .select('id, payment_status')
      .eq('order_number', flittOrderId)
      .maybeSingle();
    if (!byNumber) return new Response('ok', { status: 200 });
    return applyCallback(byNumber.id, byNumber.payment_status, payload);
  }

  return applyCallback(order.id, order.payment_status, payload);
};

/** Best-effort stock decrement after Flitt marks the order paid. */
const decrementInventoryForOrder = async (orderId: string): Promise<void> => {
  const { data: items, error } = await admin
    .from('order_items')
    .select('product_id, variant_name, quantity')
    .eq('order_id', orderId);

  if (error || !items?.length) {
    if (error) console.error('inventory load failed', error);
    return;
  }

  for (const item of items) {
    if (!item.product_id) continue;
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;

    const { data: product, error: productError } = await admin
      .from('products')
      .select('id, inventory_quantity, variants')
      .eq('id', item.product_id)
      .maybeSingle();

    if (productError || !product) {
      if (productError) console.error('inventory product read failed', productError);
      continue;
    }

    let variants = Array.isArray(product.variants)
      ? product.variants.map((v: Record<string, unknown>) => ({ ...v }))
      : [];

    if (item.variant_name) {
      variants = variants.map((v: Record<string, unknown>) => {
        if (v?.name !== item.variant_name) return v;
        const key =
          v.inventoryQuantity != null
            ? 'inventoryQuantity'
            : v.inventory_quantity != null
            ? 'inventory_quantity'
            : null;
        if (!key) return v;
        const current = Number(v[key] ?? 0);
        if (!Number.isFinite(current)) return v;
        return { ...v, [key]: Math.max(0, current - qty) };
      });
    }

    const nextQty = Math.max(0, Number(product.inventory_quantity ?? 0) - qty);
    const { error: updateError } = await admin
      .from('products')
      .update({ inventory_quantity: nextQty, variants })
      .eq('id', product.id);

    if (updateError) console.error('inventory decrement failed', updateError);
  }
};

const applyCallback = async (
  orderId: string,
  currentStatus: string,
  payload: Record<string, unknown>,
): Promise<Response> => {
  if (currentStatus === 'paid') return new Response('ok', { status: 200 });

  const orderStatusValue = String(payload.order_status ?? '');
  const paymentId = payload.payment_id != null ? String(payload.payment_id) : null;

  let paymentStatus: 'pending' | 'paid' | 'failed' = 'pending';
  if (orderStatusValue === 'approved') paymentStatus = 'paid';
  else if (orderStatusValue === 'declined' || orderStatusValue === 'expired') paymentStatus = 'failed';

  if (paymentStatus === 'pending') return new Response('ok', { status: 200 });

  const update: Record<string, unknown> = { payment_status: paymentStatus };
  if (paymentId) update.flitt_payment_id = paymentId;

  await admin.from('orders').update(update).eq('id', orderId);

  if (paymentStatus === 'paid') {
    try {
      await decrementInventoryForOrder(orderId);
    } catch (err) {
      console.error('decrementInventoryForOrder failed', err);
    }
  }

  return new Response('ok', { status: 200 });
};

const ORDER_DETAIL_SELECT = `
  id, order_number, customer_name, customer_email, shipping_address,
  payment_status, status, subtotal, shipping, tax, total, created_at,
  flitt_order_id, flitt_payment_id,
  order_items (id, product_id, product_name, variant_name, quantity, price, products (slug, images))
`;

const serializeOrder = (order: any) => ({
  id: order.id,
  orderNumber: order.order_number,
  customerName: order.customer_name,
  shippingAddress: order.shipping_address,
  paymentStatus: order.payment_status,
  status: order.status,
  subtotal: Number(order.subtotal),
  shipping: Number(order.shipping),
  tax: Number(order.tax),
  total: Number(order.total),
  createdAt: order.created_at,
  flittOrderId: order.flitt_order_id,
  flittPaymentId: order.flitt_payment_id,
  items: (order.order_items || []).map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
    product: {
      id: item.product_id,
      name: item.product_name,
      slug: item.products?.slug,
      price: Number(item.price),
      images: Array.isArray(item.products?.images) ? item.products.images : [],
    },
    selectedVariant: item.variant_name ? { name: item.variant_name } : undefined,
  })),
});

const orderStatus = async (req: Request): Promise<Response> => {
  const body = await parseBody(req);
  const orderId = String(body.orderId ?? '');
  const publicToken = String(body.publicToken ?? '').trim();
  if (!orderId || !publicToken) {
    return json({ error: 'orderId and publicToken are required' }, 400);
  }

  const { data: order, error } = await admin
    .from('orders')
    .select(ORDER_DETAIL_SELECT)
    .eq('id', orderId)
    .eq('public_token', publicToken)
    .maybeSingle();

  // Same 404 for missing order and token mismatch — avoid UUID probing.
  if (error || !order) return json({ error: 'Order not found' }, 404);
  return json(serializeOrder(order));
};

/** Public guest lookup: order number + checkout email (not UUID alone). */
const lookupOrder = async (req: Request): Promise<Response> => {
  const body = await parseBody(req);
  const orderNumber = String(body.orderNumber ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!orderNumber || !email) {
    return json({ error: 'orderNumber and email are required' }, 400);
  }

  const { data: order, error } = await admin
    .from('orders')
    .select(ORDER_DETAIL_SELECT)
    .eq('order_number', orderNumber)
    .ilike('customer_email', email)
    .maybeSingle();

  if (error || !order) return json({ error: 'Order not found' }, 404);
  return json(serializeOrder(order));
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/payments/, '') || '/';

  try {
    if (req.method === 'POST' && route.startsWith('/create-token')) {
      return await createToken(req);
    }
    if (req.method === 'POST' && route.startsWith('/callback')) {
      return await handleCallback(req);
    }
    if (req.method === 'POST' && route.startsWith('/order-status')) {
      return await orderStatus(req);
    }
    if (req.method === 'POST' && route.startsWith('/lookup')) {
      return await lookupOrder(req);
    }

    // Unused but silences the unused import lint if ANON_KEY is reserved for later.
    void ANON_KEY;

    return json({ error: 'Not found. Try /create-token, /callback, /order-status or /lookup' }, 404);
  } catch (error) {
    console.error('payments function failed', error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});

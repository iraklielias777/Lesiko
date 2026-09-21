// QuickShipper quotes, dispatch, and status webhooks.
//
// quote     — checkout asks for courier fees for a dropoff. Pickup always
//             comes from Admin → Settings, never from the browser.
// requote   — payments re-checks the stored provider before minting Flitt.
// dispatch  — create a Draft QS job and lift it to ReadyForPickup after paid.
// cancel    — try QS Cancelled while no courier is assigned.
// webhook   — OrderStatusChange; secrecy is the path token (docs have no HMAC).
//
// Deploy with verify_jwt disabled: quote uses the anon key, webhook has none,
// dispatch/requote accept the service role or an admin JWT.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  asNum,
  asRecord,
  CreatedShipment,
  createDraftOrder,
  geocode,
  getFees,
  getOrder,
  Pickup,
  qsConfigured,
  QsError,
  registerWebhook,
  setOrderStatus,
} from './qs.ts';
import { WhisperrEvents } from '../../../whisperr-events.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const WEBHOOK_SECRET = (Deno.env.get('QS_WEBHOOK_SECRET') || '').trim();
const FEE_SLACK = 0.5;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Severity = 'info' | 'warning' | 'critical';

const alert = async (
  kind: string,
  severity: Severity,
  message: string,
  context: Record<string, unknown> = {},
): Promise<void> => {
  const { error } = await admin.from('ops_alerts').insert({ kind, severity, message, context });
  if (error) console.error('ops_alerts insert failed', error, { kind, message });
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const parseBody = async (req: Request): Promise<Record<string, unknown>> => {
  const text = await req.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return Object.fromEntries(new URLSearchParams(text).entries());
  }
};

const bearer = (req: Request) => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();

const isServiceRole = (req: Request) => {
  const token = bearer(req);
  return token === SERVICE_ROLE_KEY;
};

const isAdmin = async (req: Request): Promise<boolean> => {
  const token = bearer(req);
  if (!token || token === ANON_KEY) return false;
  if (token === SERVICE_ROLE_KEY) return true;
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;
  const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
  return profile?.role === 'admin';
};

const requireStaff = async (req: Request): Promise<Response | null> => {
  if (isServiceRole(req)) return null;
  if (await isAdmin(req)) return null;
  return json({ error: 'Forbidden' }, 403);
};

interface StorePickup {
  pickup: Pickup | null;
  currency: string;
  taxRate: number;
  freeShippingThreshold: number;
  shippingRate: number;
}

const loadSettings = async (): Promise<StorePickup> => {
  const { data } = await admin.from('site_content').select('content').eq('key', 'store_settings').maybeSingle();
  const c = (data?.content ?? {}) as Record<string, unknown>;
  const address = String(c.pickupAddress || '').trim();
  const city = String(c.pickupCity || 'Tbilisi').trim() || 'Tbilisi';
  let lat = asNum(c.pickupLat);
  let lng = asNum(c.pickupLng);
  if (address && (lat == null || lng == null)) {
    const geo = await geocode(`${address}, ${city}, Georgia`);
    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
    }
  }
  const pickup = address && lat != null && lng != null
    ? {
        address,
        city,
        lat,
        lng,
        name: String(c.pickupName || c.storeName || 'LesiKo').trim(),
        phone: String(c.pickupPhone || '').trim(),
        comment: String(c.pickupComment || '').trim(),
        parcelDimensionId: asNum(c.parcelDimensionId) ?? undefined,
      }
    : null;
  return {
    pickup,
    currency: String(c.currency || 'GEL').toUpperCase(),
    taxRate: Number(c.taxRate ?? 0.08),
    freeShippingThreshold: Number(c.freeShippingThreshold ?? 50),
    shippingRate: Number(c.shippingRate ?? 15),
  };
};

const rate = new Map<string, number[]>();
const allowQuote = (ip: string) => {
  const now = Date.now();
  const windowMs = 60_000;
  const hits = (rate.get(ip) || []).filter(t => now - t < windowMs);
  if (hits.length >= 12) return false;
  hits.push(now);
  rate.set(ip, hits);
  return true;
};

export const lesikoStatusFor = (qsStatus: string): 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | null => {
  switch (qsStatus) {
    case 'Draft':
    case 'ReadyForPickup':
    case 'WaitingForCourier':
    case 'Assigned':
      return 'Processing';
    case 'Pickup':
    case 'OnTheWay':
      return 'Shipped';
    case 'Delivered':
      return 'Delivered';
    case 'Cancelled':
    case 'DeliveryFailed':
      return 'Cancelled';
    default:
      return null;
  }
};

const handleQuote = async (req: Request): Promise<Response> => {
  if (!allowQuote((req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown')) {
    return json({ error: 'Too many delivery lookups. Wait a moment and try again.' }, 429);
  }

  const settings = await loadSettings();
  if (!qsConfigured() || !settings.pickup) {
    return json({
      configured: false,
      quotes: [],
      fallbackFee: settings.shippingRate,
    });
  }

  const body = await parseBody(req);
  const address1 = String(body.address1 ?? '').trim();
  const address2 = String(body.address2 ?? '').trim();
  const city = String(body.city ?? '').trim() || 'Tbilisi';
  if (!address1) return json({ error: 'Address is required' }, 400);

  let lat = asNum(body.lat);
  let lng = asNum(body.lng);
  if (lat == null || lng == null) {
    const geo = await geocode(`${address1}, ${city}, Georgia`);
    if (!geo) {
      return json({
        configured: true,
        quotes: [],
        error: 'We could not find that address — add a street number or landmark.',
        errorCode: 'address_not_found',
      }, 422);
    }
    lat = geo.lat;
    lng = geo.lng;
  }

  try {
    const quotes = await getFees(settings.pickup, {
      address: address1,
      city,
      lat,
      lng,
      comment: address2,
      name: '',
      phone: '',
    });
    return json({
      configured: true,
      quotes: quotes.map(q => ({
        providerId: q.providerId,
        providerName: q.providerName,
        logoUrl: q.logoUrl,
        fee: q.fee,
        etaMinutes: q.etaMinutes,
        parcelDimensionId: q.parcelDimensionId,
      })),
      lat,
      lng,
      fromLat: settings.pickup.lat,
      fromLng: settings.pickup.lng,
      fallbackFee: settings.shippingRate,
    });
  } catch (err) {
    console.error('quote failed', err);
    return json({
      configured: true,
      quotes: [],
      fallbackFee: settings.shippingRate,
      error: err instanceof QsError ? err.message : 'Delivery quotes are unavailable right now.',
      lat,
      lng,
    }, 502);
  }
};

const snapshotQuote = (raw: unknown) => {
  const q = asRecord(raw);
  if (!q) return null;
  const fee = asNum(q.fee);
  const providerId = asNum(q.providerId);
  const source = String(q.source || '');
  if (source === 'quickshipper' && providerId != null && fee != null) {
    return {
      source: 'quickshipper' as const,
      providerId,
      providerName: String(q.providerName || ''),
      fee,
      parcelDimensionId: asNum(q.parcelDimensionId) ?? undefined,
      fromLat: asNum(q.fromLat),
      fromLng: asNum(q.fromLng),
      toLat: asNum(q.toLat),
      toLng: asNum(q.toLng),
    };
  }
  if (source === 'fallback' && fee != null) {
    return { source: 'fallback' as const, fee };
  }
  return null;
};

const handleRequote = async (req: Request): Promise<Response> => {
  const denied = await requireStaff(req);
  if (denied) return denied;

  const body = await parseBody(req);
  const orderId = String(body.orderId ?? '');
  if (!orderId) return json({ error: 'orderId is required' }, 400);

  const { data: order, error } = await admin
    .from('orders')
    .select('id, shipping_quote, shipping_address')
    .eq('id', orderId)
    .maybeSingle();
  if (error || !order) return json({ error: 'Order not found' }, 404);

  const quote = snapshotQuote(order.shipping_quote);
  if (!quote || quote.source !== 'quickshipper') {
    return json({ source: quote?.source || 'none', fee: quote?.fee ?? null, liveFee: null, ok: true });
  }

  const settings = await loadSettings();
  if (!qsConfigured() || !settings.pickup) {
    return json({ error: 'Courier service is not configured' }, 503);
  }

  const addr = asRecord(order.shipping_address) || {};
  const toLat = quote.toLat ?? asNum(addr.lat);
  const toLng = quote.toLng ?? asNum(addr.lng);
  if (toLat == null || toLng == null) {
    return json({ error: 'Shipping quote is missing coordinates' }, 400);
  }

  try {
    const quotes = await getFees(settings.pickup, {
      address: String(addr.address1 || ''),
      city: String(addr.city || settings.pickup.city),
      lat: toLat,
      lng: toLng,
      comment: String(addr.address2 || ''),
      name: '',
      phone: '',
    });
    const live = quotes.find(q => q.providerId === quote.providerId);
    if (!live) {
      // The stored courier vanished from the live quote, so payment cannot proceed
      // until the shopper picks a delivery option again.
      WhisperrEvents.checkoutBlockedByStockOrReprice({
        blockType: 'courier_unavailable',
        quoteSource: quote.source,
        storedFee: quote.fee,
        liveFee: null,
      });
      return json({
        source: 'quickshipper',
        fee: quote.fee,
        liveFee: null,
        ok: false,
        error: 'That courier is no longer available for this address.',
      });
    }
    const delta = Math.abs(live.fee - quote.fee);
    if (delta > FEE_SLACK) {
      // Live courier fee drifted past the tolerance, so checkout is blocked until
      // delivery is chosen again.
      WhisperrEvents.checkoutBlockedByStockOrReprice({
        blockType: 'delivery_fee_changed',
        quoteSource: quote.source,
        storedFee: quote.fee,
        liveFee: live.fee,
      });
    }
    return json({
      source: 'quickshipper',
      fee: quote.fee,
      liveFee: live.fee,
      ok: delta <= FEE_SLACK,
      error: delta > FEE_SLACK
        ? 'Shipping cost changed. Go back and pick a courier again.'
        : undefined,
    });
  } catch (err) {
    console.error('requote failed', err);
    return json({
      error: err instanceof QsError ? err.message : 'Could not re-check shipping',
      ok: false,
    }, 502);
  }
};

const dispatchOrder = async (orderId: string): Promise<{ ok: boolean; error?: string }> => {
  const { data: order, error } = await admin
    .from('orders')
    .select('id, order_number, payment_status, customer_name, shipping_address, shipping_quote, qs_order_id')
    .eq('id', orderId)
    .maybeSingle();
  if (error || !order) return { ok: false, error: 'Order not found' };
  if (order.payment_status !== 'paid') return { ok: false, error: 'Order is not paid' };
  if (order.qs_order_id) return { ok: true };

  const quote = snapshotQuote(order.shipping_quote);
  if (!quote || quote.source !== 'quickshipper' || quote.providerId == null) {
    return { ok: true };
  }

  const settings = await loadSettings();
  if (!qsConfigured() || !settings.pickup) {
    return { ok: false, error: 'Courier service is not configured' };
  }

  const addr = asRecord(order.shipping_address) || {};
  const toLat = asNum(addr.lat) ?? quote.toLat;
  const toLng = asNum(addr.lng) ?? quote.toLng;
  if (toLat == null || toLng == null) return { ok: false, error: 'Dropoff coordinates are missing' };

  const address1 = String(addr.address1 || '').trim();
  const city = String(addr.city || settings.pickup.city).trim();
  const name = String(order.customer_name || `${addr.firstName || ''} ${addr.lastName || ''}`).trim();
  const phone = String(addr.phone || settings.pickup.phone).trim();

  try {
    const created = await createDraftOrder({
      pickup: settings.pickup,
      dropoff: {
        address: address1,
        city,
        lat: toLat,
        lng: toLng,
        comment: String(addr.address2 || addr.comment || ''),
        name,
        phone,
      },
      providerId: quote.providerId,
      parcelDimensionId: quote.parcelDimensionId,
      comment: `Lesiko ${order.order_number}`,
    });

    let status = created.status || 'Draft';
    if (status === 'Draft') {
      await setOrderStatus(created.id, 'ReadyForPickup');
      status = 'ReadyForPickup';
    }

    const mapped = lesikoStatusFor(status) || 'Processing';
    await admin.from('orders').update({
      qs_order_id: created.id,
      qs_order_no: created.orderNo || null,
      qs_status: status,
      qs_tracking_url: created.trackingUrl || null,
      qs_dispatched_at: new Date().toISOString(),
      status: mapped,
    }).eq('id', orderId);

    // Courier job exists and the paid order is stamped as dispatched.
    WhisperrEvents.courierShipmentBooked({
      orderId,
      courierShipmentId: created.id,
      courierStatus: status,
      orderStatus: mapped,
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('dispatch failed', err);
    // Confirmed booking failure on an already-paid order.
    WhisperrEvents.courierBookingFailedAfterPayment({
      orderId,
      failureCategory: err instanceof QsError ? 'courier_api_error' : 'unexpected_error',
    });
    await alert('delivery_dispatch_failed', 'critical',
      `Could not book a courier for paid order ${order.order_number}`,
      { orderId, orderNumber: order.order_number, error: message });
    return { ok: false, error: message };
  }
};

const handleDispatch = async (req: Request): Promise<Response> => {
  const denied = await requireStaff(req);
  if (denied) return denied;
  const body = await parseBody(req);
  const orderId = String(body.orderId ?? '');
  if (!orderId) return json({ error: 'orderId is required' }, 400);
  const result = await dispatchOrder(orderId);
  return json(result, result.ok ? 200 : 409);
};

const applyLiveShipment = async (orderId: string, live: CreatedShipment) => {
  const mapped = live.status ? lesikoStatusFor(live.status) : null;
  const update: Record<string, unknown> = {};
  if (live.status) update.qs_status = live.status;
  if (live.trackingUrl) update.qs_tracking_url = live.trackingUrl;
  if (live.orderNo) update.qs_order_no = live.orderNo;
  if (mapped) update.status = mapped;
  if (Object.keys(update).length) {
    await admin.from('orders').update(update).eq('id', orderId);
  }
};

const handleRefresh = async (req: Request): Promise<Response> => {
  const denied = await requireStaff(req);
  if (denied) return denied;
  const body = await parseBody(req);
  const orderId = String(body.orderId ?? '');
  if (!orderId) return json({ error: 'orderId is required' }, 400);

  const { data: order } = await admin
    .from('orders')
    .select('id, qs_order_id')
    .eq('id', orderId)
    .maybeSingle();
  if (!order?.qs_order_id) return json({ error: 'No courier job on this order' }, 404);

  try {
    const live = await getOrder(Number(order.qs_order_id));
    if (!live) return json({ error: 'Courier did not return that job' }, 502);
    await applyLiveShipment(order.id, live);
    return json({ ok: true, qsStatus: live.status, trackingUrl: live.trackingUrl });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
};

const handleCancel = async (req: Request): Promise<Response> => {
  const denied = await requireStaff(req);
  if (denied) return denied;
  const body = await parseBody(req);
  const orderId = String(body.orderId ?? '');
  if (!orderId) return json({ error: 'orderId is required' }, 400);

  const { data: order } = await admin
    .from('orders')
    .select('id, qs_order_id, qs_status')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return json({ error: 'Order not found' }, 404);
  if (!order.qs_order_id) return json({ ok: true, skipped: true });

  const current = String(order.qs_status || '');
  const locked = ['Assigned', 'Pickup', 'OnTheWay', 'Delivered'].includes(current);
  if (locked) {
    await alert('delivery_cancel_blocked', 'warning',
      'A courier is already assigned — cancel this job in QuickShipper',
      { orderId, qsOrderId: order.qs_order_id, qsStatus: current });
    return json({ ok: false, error: 'Courier already assigned. Cancel in QuickShipper.' }, 409);
  }

  try {
    await setOrderStatus(Number(order.qs_order_id), 'Cancelled');
    await admin.from('orders').update({ qs_status: 'Cancelled' }).eq('id', orderId);
    return json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await alert('delivery_cancel_failed', 'warning', message, { orderId, qsOrderId: order.qs_order_id });
    return json({ ok: false, error: message }, 502);
  }
};

const handleWebhook = async (req: Request, secret: string): Promise<Response> => {
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return json({ error: 'Not found' }, 404);
  }
  const body = await parseBody(req);
  const status = String(body.Status || body.status || '');
  const orderWrap = asRecord(body.Order) || asRecord(body.order) || {};
  const qsId = asNum(body.OrderId) ?? asNum(body.orderId) ?? asNum(orderWrap.Id) ?? asNum(orderWrap.id);
  if (qsId == null) return new Response('ok', { status: 200 });

  const tracking = orderWrap.TrackingUrl || orderWrap.trackingUrl || body.TrackingUrl;
  const qsStatus = String(orderWrap.Status || orderWrap.status || status || '');

  const { data: order } = await admin
    .from('orders')
    .select('id, status, qs_status')
    .eq('qs_order_id', qsId)
    .maybeSingle();
  if (!order) return new Response('ok', { status: 200 });

  const mapped = lesikoStatusFor(qsStatus);
  const update: Record<string, unknown> = {
    qs_status: qsStatus || order.qs_status,
    qs_webhook_at: new Date().toISOString(),
  };
  if (typeof tracking === 'string' && tracking) update.qs_tracking_url = tracking;
  if (mapped) update.status = mapped;

  await admin.from('orders').update(update).eq('id', order.id);

  // Fulfilment milestones, deduplicated against repeated webhook deliveries by
  // comparing with the fulfilment status the order carried before this update.
  if (mapped === 'Shipped' && order.status !== 'Shipped') {
    WhisperrEvents.orderShipped({
      orderId: order.id,
      courierShipmentId: qsId,
      courierStatus: qsStatus,
      orderStatus: mapped,
    });
  } else if (mapped === 'Delivered' && order.status !== 'Delivered') {
    WhisperrEvents.orderDelivered({
      orderId: order.id,
      courierShipmentId: qsId,
      courierStatus: qsStatus,
      orderStatus: mapped,
    });
  }

  if (qsStatus === 'DeliveryFailed' && order.qs_status !== 'DeliveryFailed') {
    WhisperrEvents.deliveryFailedOrCancelled({
      orderId: order.id,
      courierShipmentId: qsId,
      deliveryOutcome: 'delivery_failed',
      courierStatus: qsStatus,
    });
  } else if (qsStatus === 'Cancelled' && order.status !== 'Cancelled') {
    WhisperrEvents.deliveryFailedOrCancelled({
      orderId: order.id,
      courierShipmentId: qsId,
      deliveryOutcome: 'cancelled',
      courierStatus: qsStatus,
    });
  }

  if (qsStatus === 'DeliveryFailed') {
    await alert('delivery_failed', 'critical',
      `Courier reported delivery failed for QuickShipper order ${qsId}`,
      { orderId: order.id, qsOrderId: qsId, qsStatus });
  } else if (qsStatus === 'Cancelled' && order.status !== 'Cancelled') {
    await alert('delivery_cancelled', 'warning',
      `Courier cancelled QuickShipper order ${qsId} — Flitt is not refunded automatically`,
      { orderId: order.id, qsOrderId: qsId, qsStatus });
  }

  return new Response('ok', { status: 200 });
};

const handleSetupWebhook = async (req: Request): Promise<Response> => {
  const denied = await requireStaff(req);
  if (denied) return denied;
  if (!WEBHOOK_SECRET) return json({ error: 'QS_WEBHOOK_SECRET is not set' }, 503);
  const url = `${SUPABASE_URL}/functions/v1/delivery/webhook/${WEBHOOK_SECRET}`;
  try {
    await registerWebhook(url);
    return json({ ok: true, callBackUrl: url });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/delivery/, '') || '/';

  try {
    if (req.method === 'POST' && route.startsWith('/quote')) return await handleQuote(req);
    if (req.method === 'POST' && route.startsWith('/requote')) return await handleRequote(req);
    if (req.method === 'POST' && route.startsWith('/dispatch')) return await handleDispatch(req);
    if (req.method === 'POST' && route.startsWith('/refresh')) return await handleRefresh(req);
    if (req.method === 'POST' && route.startsWith('/cancel')) return await handleCancel(req);
    if (req.method === 'POST' && route.startsWith('/setup-webhook')) return await handleSetupWebhook(req);

    const hook = route.match(/^\/webhook\/([^/]+)/);
    if (hook && (req.method === 'POST' || req.method === 'GET')) {
      return await handleWebhook(req, decodeURIComponent(hook[1]));
    }

    return json({ error: 'Not found' }, 404);
  } catch (error) {
    console.error('delivery function failed', error);
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});

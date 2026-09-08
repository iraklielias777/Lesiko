/**
 * QuickShipper REST client. Field names follow scripts/fixtures/quickshipper/
 * (webhook sample + documented fees query). Live captures overwrite those
 * fixtures; keep this mapper tolerant of PascalCase and camelCase.
 */

const AUTH_URL = (Deno.env.get('QS_AUTH_URL') || 'https://test-auth.quickshipper.ge').replace(/\/+$/, '');
const API_URL = (Deno.env.get('QS_API_URL') || 'https://delivery-test.quickshipper.ge').replace(/\/+$/, '');
const CLIENT_ID = Deno.env.get('QS_CLIENT_ID') || 'DeliveryApiClient';
const CLIENT_SECRET = Deno.env.get('QS_CLIENT_SECRET') || 'DeliveryApiSecret';
const USERNAME = Deno.env.get('QS_USERNAME') || '';
const PASSWORD = Deno.env.get('QS_PASSWORD') || '';

export const qsConfigured = () => !!(USERNAME && PASSWORD);

type TokenCache = { access: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

const pick = (obj: Record<string, unknown> | null | undefined, ...keys: string[]): unknown => {
  if (!obj) return undefined;
  for (const key of keys) {
    if (obj[key] != null && obj[key] !== '') return obj[key];
    const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    if (found && obj[found] != null && obj[found] !== '') return obj[found];
  }
  return undefined;
};

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export const asNum = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const unwrap = (body: unknown): Record<string, unknown> => {
  const root = asRecord(body) || {};
  const nested = asRecord(root.data) || asRecord(root.result) || asRecord(root.Result) || asRecord(root.order) || asRecord(root.Order);
  return nested ? { ...root, ...nested } : root;
};

const findArray = (body: unknown, ...names: string[]): unknown[] => {
  const root = asRecord(body);
  if (!root) return [];
  for (const name of names) {
    const hit = pick(root, name);
    if (Array.isArray(hit)) return hit;
  }
  for (const value of Object.values(root)) {
    if (Array.isArray(value) && value.some(item => item && typeof item === 'object')) return value;
  }
  return [];
};

export class QsError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'QsError';
    this.status = status;
  }
}

const requestToken = async (): Promise<string> => {
  if (!qsConfigured()) throw new QsError('QuickShipper is not configured', 503);
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) return tokenCache.access;

  const basic = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch(`${AUTH_URL}/connect/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      scope: 'DeliveryApi',
      username: USERNAME,
      password: PASSWORD,
    }),
  });
  const json = await res.json().catch(() => ({}));
  const access = String(pick(asRecord(json) || {}, 'access_token', 'accessToken') || '');
  if (!res.ok || !access) {
    throw new QsError('Could not authenticate with the courier service', 503);
  }
  const expiresIn = asNum(pick(asRecord(json) || {}, 'expires_in', 'expiresIn')) ?? 3600;
  tokenCache = { access, expiresAt: now + expiresIn * 1000 };
  return access;
};

const qsFetch = async (path: string, init: RequestInit = {}): Promise<unknown> => {
  const token = await requestToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  const root = asRecord(json) || {};
  const ok = root.success !== false && root.Success !== false && res.ok;
  if (!ok) {
    const message = String(
      pick(root, 'userMessage', 'UserMessage', 'developerMessage', 'DeveloperMessage', 'message') ||
        `Courier request failed (${res.status})`,
    );
    throw new QsError(message, res.status >= 400 && res.status < 500 ? res.status : 502);
  }
  return json;
};

export interface Pickup {
  address: string;
  city: string;
  lat: number;
  lng: number;
  name: string;
  phone: string;
  comment: string;
  parcelDimensionId?: number;
}

export interface Dropoff {
  address: string;
  city: string;
  lat: number;
  lng: number;
  comment: string;
  name: string;
  phone: string;
}

export interface QsProviderQuote {
  providerId: number;
  providerName: string;
  logoUrl?: string;
  fee: number;
  etaMinutes?: number;
  hasWeight: boolean;
  parcelDimensionId?: number;
}

const mapProvider = (raw: unknown): QsProviderQuote | null => {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asNum(pick(row, 'providerId', 'ProviderId', 'id', 'Id'));
  const fee = asNum(pick(row, 'fee', 'Fee', 'serviceFee', 'ServiceFee', 'orderPrice', 'OrderPrice', 'price', 'Price'));
  if (id == null || fee == null || fee < 0) return null;
  const name = String(pick(row, 'providerName', 'ProviderName', 'name', 'Name') || 'Courier');
  const logo = pick(row, 'logoUrl', 'LogoUrl');
  const eta = asNum(pick(row, 'approximateDeliveryMin', 'ApproximateDeliveryMin', 'etaMinutes'));
  const hasWeight = Boolean(pick(row, 'hasWeight', 'HasWeight'));
  const parcel = asNum(pick(row, 'parcelDimensionId', 'ParcelDimensionId'));
  return {
    providerId: id,
    providerName: name,
    logoUrl: typeof logo === 'string' && logo ? logo : undefined,
    fee: Math.round(fee * 100) / 100,
    etaMinutes: eta != null && eta > 0 ? Math.round(eta) : undefined,
    hasWeight,
    parcelDimensionId: parcel ?? undefined,
  };
};

export const getFees = async (from: Pickup, to: Dropoff): Promise<QsProviderQuote[]> => {
  const params = new URLSearchParams({
    FromStreetName: from.address,
    FromCityName: from.city,
    FromLatitude: String(from.lat),
    FromLongitude: String(from.lng),
    ToStreetName: to.address,
    ToCityName: to.city,
    ToLatitude: String(to.lat),
    ToLongitude: String(to.lng),
  });
  const json = await qsFetch(`/v1/order/fees?${params}`);
  const rows = findArray(json, 'providers', 'Providers', 'fees', 'Fees', 'data');
  const quotes = rows.map(mapProvider).filter((q): q is QsProviderQuote => !!q);

  for (const quote of quotes) {
    if (!quote.hasWeight || quote.parcelDimensionId) continue;
    if (from.parcelDimensionId) {
      quote.parcelDimensionId = from.parcelDimensionId;
      continue;
    }
    try {
      const weightParams = new URLSearchParams({
        FromLatitude: String(from.lat),
        FromLongitude: String(from.lng),
        ToLatitude: String(to.lat),
        ToLongitude: String(to.lng),
        ProviderId: String(quote.providerId),
      });
      const weights = await qsFetch(`/v1/Order/weights?${weightParams}`);
      const options = findArray(weights, 'weights', 'Weights', 'data');
      const first = asRecord(options[0]);
      const id = first ? asNum(pick(first, 'parcelDimensionId', 'ParcelDimensionId', 'id', 'Id')) : null;
      if (id != null) quote.parcelDimensionId = id;
    } catch (err) {
      console.error('QS weights failed', err);
    }
  }

  return quotes;
};

export interface CreatedShipment {
  id: number;
  orderNo?: string;
  status?: string;
  trackingUrl?: string;
}

const mapCreated = (json: unknown): CreatedShipment | null => {
  const root = unwrap(json);
  const id = asNum(pick(root, 'id', 'Id', 'orderId', 'OrderId'));
  if (id == null) return null;
  const tracking = pick(root, 'trackingUrl', 'TrackingUrl');
  const status = pick(root, 'status', 'Status');
  const orderNo = pick(root, 'orderNo', 'OrderNo');
  return {
    id,
    orderNo: typeof orderNo === 'string' ? orderNo : undefined,
    status: typeof status === 'string' ? status : undefined,
    trackingUrl: typeof tracking === 'string' ? tracking : undefined,
  };
};

export const splitPhone = (raw: string): { prefix: string; number: string } => {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('995') && digits.length > 9) {
    return { prefix: '995', number: digits.slice(3) };
  }
  if (digits.startsWith('0') && digits.length >= 9) {
    return { prefix: '995', number: digits.slice(1) };
  }
  return { prefix: '995', number: digits };
};

export const createDraftOrder = async (input: {
  pickup: Pickup;
  dropoff: Dropoff;
  providerId: number;
  parcelDimensionId?: number;
  comment: string;
}): Promise<CreatedShipment> => {
  const phone = splitPhone(input.dropoff.phone);
  const pickupPhone = splitPhone(input.pickup.phone);
  const body: Record<string, unknown> = {
    Status: 'Draft',
    DeliveryType: 'ASAP',
    Channel: 'DeliveryApi',
    ProviderId: input.providerId,
    Comment: input.comment,
    FromStreetName: input.pickup.address,
    FromCityName: input.pickup.city,
    FromLatitude: input.pickup.lat,
    FromLongitude: input.pickup.lng,
    FromAddressComment: input.pickup.comment || '',
    ToStreetName: input.dropoff.address,
    ToCityName: input.dropoff.city,
    ToLatitude: input.dropoff.lat,
    ToLongitude: input.dropoff.lng,
    ToAddressComment: input.dropoff.comment || '',
    AddressFrom: input.pickup.address,
    AddressTo: input.dropoff.address,
    Customer: {
      Name: input.dropoff.name,
      PhonePrefix: phone.prefix,
      PhoneNumber: phone.number,
    },
    Pickup: {
      Name: input.pickup.name,
      PhonePrefix: pickupPhone.prefix,
      PhoneNumber: pickupPhone.number,
    },
  };
  if (input.parcelDimensionId != null) body.ParcelDimensionId = input.parcelDimensionId;

  const json = await qsFetch('/v1/order', { method: 'POST', body: JSON.stringify(body) });
  const created = mapCreated(json);
  if (!created) throw new QsError('Courier did not return a shipment id');
  return created;
};

export const setOrderStatus = async (orderId: number, status: string): Promise<void> => {
  await qsFetch('/v1/order/status', {
    method: 'POST',
    body: JSON.stringify({ OrderId: orderId, Status: status }),
  });
};

export const getOrder = async (orderId: number): Promise<CreatedShipment | null> => {
  const json = await qsFetch(`/v1/order?orderId=${orderId}`);
  return mapCreated(json);
};

export const registerWebhook = async (callBackUrl: string, maxRetryCount = 5): Promise<void> => {
  await qsFetch('/v1/webhook', {
    method: 'POST',
    body: JSON.stringify({
      callBackUrl,
      maxRetryCount,
      type: 'OrderStatusChange',
    }),
  });
};

export interface GeoPoint {
  lat: number;
  lng: number;
}

export const geocode = async (query: string): Promise<GeoPoint | null> => {
  const q = query.trim();
  if (!q) return null;
  const googleKey = (Deno.env.get('GOOGLE_GEOCODING_KEY') || '').trim();
  if (googleKey) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&region=ge&key=${encodeURIComponent(googleKey)}`;
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    const loc = json?.results?.[0]?.geometry?.location;
    const lat = asNum(loc?.lat);
    const lng = asNum(loc?.lng);
    if (lat != null && lng != null) return { lat, lng };
    return null;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ge&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LesikoCosmetics/1.0 (support@lesiko.ge)' },
  });
  const json = await res.json().catch(() => []);
  const first = Array.isArray(json) ? json[0] : null;
  const lat = asNum(first?.lat);
  const lng = asNum(first?.lon);
  if (lat != null && lng != null) return { lat, lng };
  return null;
};

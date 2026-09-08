import { ShippingQuote } from '../types';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '../lib/supabase';

export interface CourierQuoteOption {
  providerId: number;
  providerName: string;
  logoUrl?: string;
  fee: number;
  etaMinutes?: number;
  parcelDimensionId?: number;
}

export interface QuoteResponse {
  configured: boolean;
  quotes: CourierQuoteOption[];
  lat?: number;
  lng?: number;
  fromLat?: number;
  fromLng?: number;
  fallbackFee?: number;
  error?: string;
  errorCode?: string;
}

const deliveryUrl = (path: string) => `${SUPABASE_URL}/functions/v1/delivery${path}`;

async function invokeDelivery<T>(
  path: string,
  body: Record<string, unknown>,
  authed = false,
): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase is not configured');
  }

  let bearer = SUPABASE_PUBLISHABLE_KEY;
  if (authed && supabase) {
    const { data } = await supabase.auth.getSession();
    bearer = data.session?.access_token || SUPABASE_PUBLISHABLE_KEY;
  }

  const res = await fetch(deliveryUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (res.status === 422) return json as T;
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || 'Delivery request failed');
  }
  return json as T;
}

export const DeliveryService = {
  quote: (input: {
    address1: string;
    address2?: string;
    city: string;
    lat?: number;
    lng?: number;
  }) => invokeDelivery<QuoteResponse>('/quote', input),

  dispatch: (orderId: string) =>
    invokeDelivery<{ ok: boolean; error?: string }>('/dispatch', { orderId }, true),

  refresh: (orderId: string) =>
    invokeDelivery<{ ok: boolean; error?: string; qsStatus?: string; trackingUrl?: string }>(
      '/refresh',
      { orderId },
      true,
    ),

  cancel: (orderId: string) =>
    invokeDelivery<{ ok: boolean; error?: string; skipped?: boolean }>('/cancel', { orderId }, true),

  toSnapshot: (
    option: CourierQuoteOption,
    coords: { lat: number; lng: number; fromLat: number; fromLng: number },
  ): ShippingQuote => ({
    source: 'quickshipper',
    providerId: option.providerId,
    providerName: option.providerName,
    logoUrl: option.logoUrl,
    fee: option.fee,
    etaMinutes: option.etaMinutes,
    parcelDimensionId: option.parcelDimensionId,
    fromLat: coords.fromLat,
    fromLng: coords.fromLng,
    toLat: coords.lat,
    toLng: coords.lng,
    quotedAt: new Date().toISOString(),
  }),

  fallbackSnapshot: (fee: number): ShippingQuote => ({
    source: 'fallback',
    fee,
    quotedAt: new Date().toISOString(),
  }),
};

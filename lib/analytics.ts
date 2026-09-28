import type { CartItem, Order, Product, ProductVariant } from '../types';
import { resolvePrice } from './pricing';

/**
 * Google Analytics 4 stays a marketing sink, switched on by a measurement ID.
 * The same events are also queued to the store analytics function so Admin
 * can rank products and categories without reading GA. No user ids, no email.
 */
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js?id=';

let measurementId = '';

export const analyticsEnabled = () => measurementId !== '';

export const initAnalytics = (id?: string) => {
  const clean = (id || '').trim();
  if (!clean || measurementId || typeof window === 'undefined') return;
  measurementId = clean;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag reads `arguments`, not a rest array, so this cannot be an arrow.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  // Page views are sent by the router, so a single-page app is not counted
  // once per lifetime.
  window.gtag('config', clean, { send_page_view: false, anonymize_ip: true });

  const script = document.createElement('script');
  script.async = true;
  script.src = `${GTAG_SRC}${encodeURIComponent(clean)}`;
  document.head.appendChild(script);

  trackPageView(window.location.pathname + window.location.search);
};

export const trackPageView = (path: string) => {
  if (!measurementId || !window.gtag) return;
  window.gtag('event', 'page_view', { page_path: path, page_location: window.location.href });
};

const SESSION_KEY = 'lesiko-analytics-session';
const FIRST_PARTY = new Set(['view_item', 'view_category', 'add_to_cart', 'begin_checkout', 'search']);

type QueuedEvent = { event: string; productId?: string; category?: string; search?: string };

let queue: QueuedEvent[] = [];
let flushTimer = 0;

const sessionId = () => {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return '';
  }
};

const endpoint = () => {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!url || !key) return null;
  return { url: `${url.replace(/\/+$/, '')}/functions/v1/analytics`, key };
};

export const flushAnalytics = () => {
  const target = endpoint();
  const session = sessionId();
  if (!target || !session || queue.length === 0) return;
  const events = queue.splice(0, 20);
  const body = JSON.stringify({ session, events });
  fetch(target.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: target.key,
      Authorization: `Bearer ${target.key}`,
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
};

const enqueue = (event: QueuedEvent) => {
  if (typeof window === 'undefined' || !FIRST_PARTY.has(event.event)) return;
  queue.push(event);
  if (!flushTimer) {
    flushTimer = window.setTimeout(() => {
      flushTimer = 0;
      flushAnalytics();
    }, 1500);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flushAnalytics());
}

const firstPartyFrom = (event: string, params: Record<string, unknown>): QueuedEvent | null => {
  if (event === 'view_item' || event === 'add_to_cart') {
    const items = Array.isArray(params.items) ? params.items : [];
    const first = items[0] as { item_id?: string } | undefined;
    if (!first?.item_id) return null;
    return { event, productId: String(first.item_id) };
  }
  if (event === 'view_category') {
    const category = typeof params.category === 'string' ? params.category : '';
    if (!category) return null;
    return { event, category };
  }
  if (event === 'begin_checkout') return { event };
  if (event === 'search') {
    const term = typeof params.search_term === 'string' ? params.search_term : '';
    if (!term || term.includes('@')) return null;
    return { event, search: term.slice(0, 80) };
  }
  return null;
};

export const track = (event: string, params: Record<string, unknown> = {}) => {
  const own = firstPartyFrom(event, params);
  if (own) enqueue(own);
  if (!measurementId || !window.gtag) return;
  window.gtag('event', event, params);
};

export const itemOf = (product: Product, variant?: ProductVariant | null, quantity = 1) => ({
  item_id: product.id,
  item_name: product.name,
  item_brand: product.brand?.name,
  item_category: product.category?.slug,
  item_variant: variant?.name,
  price: resolvePrice(product, variant).price,
  quantity,
});

export const itemsOfCart = (items: CartItem[]) =>
  items.map(line => itemOf(line.product, line.selectedVariant, line.quantity));

export const itemsOfOrder = (order: Order) =>
  (order.items || []).map(line => ({
    item_id: line.product?.id,
    item_name: line.product?.name,
    item_variant: line.selectedVariant?.name,
    price: line.product ? resolvePrice(line.product, line.selectedVariant).price : undefined,
    quantity: line.quantity,
  }));

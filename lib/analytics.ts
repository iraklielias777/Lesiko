import type { CartItem, Order, Product, ProductVariant } from '../types';
import { resolvePrice } from './pricing';

/**
 * Google Analytics 4, switched on by a measurement ID in Admin → Settings and
 * a no-op until one exists. Only the checkout funnel is reported — view_item,
 * add_to_cart, begin_checkout, purchase — plus a page_view per route, which is
 * what a "where do shoppers drop off" question actually needs. No user ids,
 * no email addresses, nothing a customer typed.
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

export const track = (event: string, params: Record<string, unknown> = {}) => {
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

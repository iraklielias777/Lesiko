
import { CartItem, Order } from '../types';
import { OrderService } from './order-service';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '../lib/supabase';

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface FlittTokenResult {
  token: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  publicToken?: string;
  total?: number;
  subtotal?: number;
  shipping?: number;
  tax?: number;
}

export interface FlittCheckoutHandlers {
  onSuccess?: () => void;
  onError?: (message?: string) => void;
}

type FlittCheckoutApp = {
  on?: (event: string, cb: (model: unknown) => void) => FlittCheckoutApp;
  $on?: (event: string, cb: (model: unknown) => void) => FlittCheckoutApp;
};

declare global {
  interface Window {
    checkout?: (selector: string, options: Record<string, unknown>) => FlittCheckoutApp | void;
  }
}

const FLITT_JS = 'https://pay.flitt.com/latest/checkout-vue/checkout.js';
const FLITT_CSS = 'https://pay.flitt.com/latest/checkout-vue/checkout.css';
const PENDING_ORDER_KEY = 'lesiko_pending_order';
const PENDING_FINGERPRINT_KEY = 'lesiko_pending_fingerprint';
const PENDING_TOKEN_KEY = 'lesiko_pending_public_token';

let flittAssetsPromise: Promise<void> | null = null;

/** Dedupes StrictMode double-mount so only one create-order/token runs. */
let inflightBoot: { key: string; promise: Promise<FlittTokenResult> } | null = null;

const paymentsUrl = (path: string) =>
  `${SUPABASE_URL}/functions/v1/payments${path}`;

async function invokePayments<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase is not configured');
  }

  const { data: sessionData } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const bearer = sessionData.session?.access_token || SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(paymentsUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${bearer}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || `Payment service failed (${res.status})`);
  }
  return json as T;
}

export function cartCheckoutFingerprint(
  items: CartItem[],
  address: { email: string; firstName: string; lastName: string; address1: string; city: string; zip: string; country: string; phone?: string },
): string {
  const cart = items
    .map((item) => ({
      p: item.product.id,
      v: item.selectedVariant?.id || item.selectedVariant?.name || '',
      q: item.quantity,
    }))
    .sort((a, b) => `${a.p}:${a.v}`.localeCompare(`${b.p}:${b.v}`));

  return JSON.stringify({
    email: address.email.trim().toLowerCase(),
    name: `${address.firstName} ${address.lastName}`.trim().toLowerCase(),
    line: [address.address1, address.city, address.zip, address.country].join('|').toLowerCase(),
    cart,
  });
}

export const PaymentService = {
  PENDING_ORDER_KEY,
  PENDING_FINGERPRINT_KEY,
  PENDING_TOKEN_KEY,

  createPendingOrder: async (order: Order): Promise<{ orderId: string; publicToken: string }> => {
    const pending: Order = { ...order, paymentStatus: 'pending', status: 'Processing' };
    return OrderService.createOrder(pending);
  },

  createFlittToken: (orderId: string, lang: string): Promise<FlittTokenResult> =>
    invokePayments<FlittTokenResult>('/create-token', {
      orderId,
      lang: lang.startsWith('ka') ? 'ka' : 'en',
    }),

  /**
   * Create a pending order (unless reusable) and mint a Flitt token.
   * `bootKey` dedupes concurrent StrictMode boots for the same cart fingerprint.
   */
  startCheckout: async (
    order: Order,
    lang: string,
    opts?: { reuseOrderId?: string | null; bootKey?: string },
  ): Promise<FlittTokenResult> => {
    const key = opts?.bootKey || order.orderNumber;

    if (inflightBoot && inflightBoot.key === key) {
      return inflightBoot.promise;
    }

    const promise = (async () => {
      let orderId = opts?.reuseOrderId || '';
      let publicToken = orderId ? sessionStorage.getItem(PENDING_TOKEN_KEY) || '' : '';

      if (orderId && publicToken) {
        try {
          const status = await PaymentService.getOrderStatus(orderId, publicToken);
          if (status.paymentStatus === 'paid') {
            throw new Error('Order is already paid');
          }
          if (status.paymentStatus !== 'pending' && status.paymentStatus !== 'failed') {
            orderId = '';
            publicToken = '';
          }
        } catch {
          orderId = '';
          publicToken = '';
        }
      } else {
        orderId = '';
        publicToken = '';
      }

      if (!orderId) {
        const created = await PaymentService.createPendingOrder(order);
        orderId = created.orderId;
        publicToken = created.publicToken;
      }

      const token = await PaymentService.createFlittToken(orderId, lang);
      return { ...token, publicToken };
    })();

    inflightBoot = { key, promise };
    try {
      return await promise;
    } finally {
      if (inflightBoot?.promise === promise) inflightBoot = null;
    }
  },

  rememberPendingCheckout: (orderId: string, fingerprint: string, publicToken: string) => {
    sessionStorage.setItem(PENDING_ORDER_KEY, orderId);
    sessionStorage.setItem(PENDING_FINGERPRINT_KEY, fingerprint);
    sessionStorage.setItem(PENDING_TOKEN_KEY, publicToken);
  },

  clearPendingCheckout: () => {
    sessionStorage.removeItem(PENDING_ORDER_KEY);
    sessionStorage.removeItem(PENDING_FINGERPRINT_KEY);
    sessionStorage.removeItem(PENDING_TOKEN_KEY);
  },

  getReusablePendingOrderId: (fingerprint: string): string | null => {
    const orderId = sessionStorage.getItem(PENDING_ORDER_KEY);
    const stored = sessionStorage.getItem(PENDING_FINGERPRINT_KEY);
    const token = sessionStorage.getItem(PENDING_TOKEN_KEY);
    if (!orderId || !token || !stored || stored !== fingerprint) return null;
    return orderId;
  },

  getPendingPublicToken: (): string | null =>
    sessionStorage.getItem(PENDING_TOKEN_KEY),

  getOrderStatus: (orderId: string, publicToken: string) =>
    invokePayments<Order>('/order-status', { orderId, publicToken }),

  lookupOrder: (orderNumber: string, email: string) =>
    invokePayments<Order>('/lookup', { orderNumber, email }),

  loadFlittAssets: (): Promise<void> => {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.checkout) return Promise.resolve();
    if (flittAssetsPromise) return flittAssetsPromise;

    flittAssetsPromise = new Promise((resolve, reject) => {
      if (!document.querySelector(`link[href="${FLITT_CSS}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FLITT_CSS;
        document.head.appendChild(link);
      }

      const existing = document.querySelector(`script[src="${FLITT_JS}"]`) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Flitt checkout')));
        if (window.checkout) resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = FLITT_JS;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Flitt checkout'));
      document.body.appendChild(script);
    });

    return flittAssetsPromise;
  },

  /**
   * Mount Flitt's embedded widget. Pass only the server-minted token in params;
   * display options are cosmetic. Server callback remains source of truth for paid.
   */
  mountCheckout: (
    selector: string,
    token: string,
    opts: { storeName: string; siteUrl: string },
    handlers?: FlittCheckoutHandlers,
  ) => {
    if (!window.checkout) {
      throw new Error('Flitt checkout SDK is not loaded');
    }

    const app = window.checkout(selector, {
      options: {
        methods: ['card'],
        methods_disabled: [],
        card_icons: ['mastercard', 'visa', 'maestro'],
        active_tab: 'card',
        full_screen: false,
        locales: ['ka', 'en'],
        show_email: false,
        amount_readonly: true,
        show_lang: true,
        theme: { type: 'light', preset: 'reset' },
        title: opts.storeName || 'LesiKo',
        link: opts.siteUrl || undefined,
      },
      params: { token },
      css_variable: {
        main: '#AED136',
        card_bg: '#1A1A1A',
      },
    });

    const bind = (event: string, cb: (model: unknown) => void) => {
      if (!app) return;
      if (typeof app.on === 'function') app.on(event, cb);
      else if (typeof app.$on === 'function') app.$on(event, cb);
    };

    if (handlers?.onSuccess) {
      bind('success', () => handlers.onSuccess?.());
    }
    if (handlers?.onError) {
      bind('error', (model: any) => {
        const message =
          model?.attr?.('error.message') ||
          model?.attr?.('error')?.message ||
          model?.data?.error?.message ||
          'Payment declined';
        handlers.onError?.(String(message));
      });
    }

    return app;
  },
};

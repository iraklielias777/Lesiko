import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '../lib/supabase';

const WIDGET_SRC = 'https://whisperr-recall.vercel.app/widget.js';
const WIDGET_KEY = 'wk_live_jKiWmDLxo6hhqJYaqgSBP6lh';

type RecallApi = {
  open?: () => void;
  identify?: (token: string) => void;
  purchase?: (order: { orderId: string; total: number; currency: string }) => void;
  on?: (event: string, fn: () => void) => void;
};

declare global {
  interface Window {
    Recall?: RecallApi;
    __recallWidgetLoaded?: boolean;
  }
}

const languageOf = (lng: string) => (lng || 'en').slice(0, 2);

export const ensureRecall = (language: string) => {
  if (typeof document === 'undefined') return;
  const lang = languageOf(language);
  let script = document.querySelector(`script[data-recall-widget="${WIDGET_KEY}"]`) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.src = WIDGET_SRC;
    script.async = true;
    script.dataset.recallWidget = WIDGET_KEY;
    script.dataset.language = lang;
    document.body.appendChild(script);
    return;
  }
  if (!window.__recallWidgetLoaded) script.dataset.language = lang;
};

export const identifyRecall = async () => {
  if (!supabase || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return;
  const { data } = await supabase.auth.getSession();
  const access = data.session?.access_token;
  if (!access) return;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/recall`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${access}`,
    },
  });
  if (!res.ok) return;
  const body = await res.json().catch(() => ({}));
  if (typeof body.token === 'string') window.Recall?.identify?.(body.token);
};

const reported = new Set<string>();

export const recallPurchase = (order: { orderId: string; total: number; currency: string }) => {
  if (!order.orderId || reported.has(order.orderId)) return;
  const send = () => {
    if (!window.Recall?.purchase) return false;
    reported.add(order.orderId);
    window.Recall.purchase({
      orderId: order.orderId,
      total: order.total,
      currency: order.currency || 'GEL',
    });
    return true;
  };
  if (send()) return;
  const timer = window.setInterval(() => {
    if (send()) window.clearInterval(timer);
  }, 500);
  window.setTimeout(() => window.clearInterval(timer), 8000);
};

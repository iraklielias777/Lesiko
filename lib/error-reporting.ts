/**
 * Reports uncaught errors to the `client-errors` edge function, which files
 * them as operator alerts (see that function for the throttling). Production
 * only, a handful per session, never the same error twice, and never anything
 * a browser extension threw. Nothing a shopper typed leaves the page: the
 * report is the error message, the stack, the path and the user agent.
 */

const MAX_PER_SESSION = 3;

const IGNORED = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,                 // cross-origin script, no detail to act on
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /The operation was aborted/i,         // navigation cancelled a fetch
];

let endpoint = '';
let sent = 0;
const seen = new Set<string>();

const describe = (reason: unknown): { message: string; stack: string } => {
  if (reason instanceof Error) return { message: reason.message, stack: reason.stack || '' };
  if (typeof reason === 'string') return { message: reason, stack: '' };
  try {
    return { message: JSON.stringify(reason).slice(0, 300), stack: '' };
  } catch {
    return { message: String(reason), stack: '' };
  }
};

export const reportError = (reason: unknown, extra = '') => {
  if (!endpoint || sent >= MAX_PER_SESSION) return;
  const { message, stack } = describe(reason);
  if (!message) return;
  const haystack = `${message}\n${stack}\n${extra}`;
  if (IGNORED.some(pattern => pattern.test(haystack))) return;

  const key = `${message}|${window.location.pathname}`;
  if (seen.has(key)) return;
  seen.add(key);
  sent += 1;

  const payload = JSON.stringify({
    message,
    stack: `${stack}\n${extra}`.trim().slice(0, 2000),
    path: window.location.pathname,
    url: window.location.href,
    userAgent: navigator.userAgent,
  });

  // keepalive lets the report finish even if the page is unloading.
  fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
};

export const installErrorReporting = (supabaseUrl: string) => {
  if (!import.meta.env.PROD || !supabaseUrl || typeof window === 'undefined') return;
  endpoint = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/client-errors`;

  window.addEventListener('error', event => {
    reportError(event.error ?? event.message);
  });
  window.addEventListener('unhandledrejection', event => {
    reportError(event.reason);
  });
};

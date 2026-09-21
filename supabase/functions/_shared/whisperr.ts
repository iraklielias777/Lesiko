import { createWhisperr, type WhisperrOptions } from 'npm:@whisperr/node@0.1.2';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { createWhisperrEvents } from '../../../whisperr-events.ts';

type Events = ReturnType<typeof createWhisperrEvents>;
type TrackerOptions = {
  apiKey: string | undefined;
  resolveCustomerId: (orderId: string) => Promise<string | null>;
  waitUntil: (task: Promise<void>) => void;
  warn?: (message: string) => void;
  fetch?: WhisperrOptions['fetch'];
};

/** Match the account association used by Lesiko's order history/RLS. Emails
 * stay in Lesiko; only the stable customer UUID is sent to Whisperr. */
export async function resolveOrderCustomerId(admin: SupabaseClient, orderId: string): Promise<string | null> {
  const { data: order, error: orderError } = await admin
    .from('orders').select('customer_email').eq('id', orderId).maybeSingle();
  if (orderError) throw new Error('order lookup failed');
  const email = order?.customer_email?.trim();
  if (!email) return null;
  // Escape LIKE metacharacters so an address containing _ or % remains exact.
  const pattern = email.replace(/[\\%_]/g, '\\$&');
  const { data: customer, error: customerError } = await admin
    .from('profiles').select('id').ilike('email', pattern)
    .eq('role', 'customer').maybeSingle();
  if (customerError) throw new Error('customer lookup failed');
  return customer?.id ?? null;
}

/** Each task owns its SDK queue and customer identity. No shared browser
 * binding, background timer, or mutable "current customer" crosses requests. */
export function createOrderWhisperrTracker(options: TrackerOptions) {
  const apiKey = options.apiKey?.trim();
  const warn = options.warn ?? ((message: string) => console.warn(message));
  let warnedMissingKey = false;

  return (orderId: string, emit: (events: Events) => void): void => {
    if (!apiKey?.startsWith('wrk_')) {
      if (!warnedMissingKey) {
        warn('[whisperr] Set WHISPERR_INGESTION_API_KEY to a server key in Supabase Edge Function secrets.');
        warnedMissingKey = true;
      }
      return;
    }
    const task = (async () => {
      try {
        const customerId = await options.resolveCustomerId(orderId);
        if (!customerId) {
          warn('[whisperr] Order event skipped: no customer account matches the order.');
          return;
        }
        const client = createWhisperr({
          apiKey,
          flushIntervalMs: 0,
          maxRetries: 1,
          requestTimeoutMs: 3000,
          fetch: options.fetch,
          onError: (error) => warn(`[whisperr] Order event delivery failed (${error.type}).`),
        });
        try {
          emit(createWhisperrEvents({
            track: (event, properties) => client.track(customerId, event, properties),
          }));
        } finally {
          await client.shutdown();
        }
      } catch {
        // Do not log addresses, credentials, or raw provider/database errors.
        warn('[whisperr] Order event could not be delivered.');
      }
    })();
    options.waitUntil(task);
  };
}

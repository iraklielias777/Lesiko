import assert from 'node:assert/strict';
import { createOrderWhisperrTracker, resolveOrderCustomerId } from './whisperr.ts';
import { bindWhisperr, createWhisperrEvents, WhisperrEvents } from '../../../whisperr-events.ts';

function fixture(overrides: Partial<Parameters<typeof createOrderWhisperrTracker>[0]> = {}) {
  const tasks: Promise<void>[] = [];
  const warnings: string[] = [];
  const requests: { url: string; body: { events: { external_user_id: string; event_type: string; properties: Record<string, unknown> }[] }; key: string }[] = [];
  const track = createOrderWhisperrTracker({
    apiKey: 'wrk_test_server',
    resolveCustomerId: async (orderId) => `customer-${orderId}`,
    waitUntil: (task) => { tasks.push(task); },
    warn: (message) => { warnings.push(message); },
    fetch: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body), key: init.headers['X-API-Key'] });
      return { ok: true, status: 202 };
    },
    ...overrides,
  });
  return { track, tasks, warnings, requests };
}

Deno.test('server tasks send with the correct customer identity and finish their flush', async () => {
  const f = fixture();
  f.track('a', (events) => events.orderPaidConfirmed({ orderId: 'a', paymentId: 'p1', gatewayOrderStatus: 'approved' }));
  f.track('b', (events) => events.orderDelivered({ orderId: 'b', courierShipmentId: 42, courierStatus: 'Delivered', orderStatus: 'Delivered' }));
  assert.equal(f.tasks.length, 2);
  await Promise.all(f.tasks);
  assert.equal(f.requests.length, 2);
  for (const request of f.requests) {
    assert.equal(request.url, 'https://api.whisperr.net/v1/events/batch');
    assert.equal(request.key, 'wrk_test_server');
    const [event] = request.body.events;
    assert.equal(event.external_user_id, `customer-${event.properties.order_id}`);
    assert.ok(['order_paid_confirmed', 'order_delivered'].includes(event.event_type));
  }
  assert.deepEqual(f.warnings, []);
});

Deno.test('missing and publishable server credentials skip sending and warn without secrets', async () => {
  for (const apiKey of [undefined, 'wpk_test_browser']) {
    const f = fixture({ apiKey, resolveCustomerId: () => { throw new Error('must not query'); } });
    for (let i = 0; i < 2; i++) f.track('a', (events) => events.orderPaidConfirmed({ orderId: 'a', paymentId: '', gatewayOrderStatus: 'approved' }));
    await Promise.all(f.tasks);
    assert.equal(f.requests.length, 0);
    assert.equal(f.warnings.length, 1);
    assert.match(f.warnings[0], /WHISPERR_INGESTION_API_KEY/);
    assert.doesNotMatch(f.warnings[0], /test_browser/);
  }
});

Deno.test('unmatched guests and lookup errors cannot create guessed customer identities', async () => {
  for (const resolveCustomerId of [async () => null, async () => { throw new Error('private@example.com'); }]) {
    const f = fixture({ resolveCustomerId });
    f.track('a', (events) => events.orderPaidConfirmed({ orderId: 'a', paymentId: '', gatewayOrderStatus: 'approved' }));
    await Promise.all(f.tasks);
    assert.equal(f.requests.length, 0);
    assert.equal(f.warnings.length, 1);
    assert.doesNotMatch(f.warnings[0], /private@example.com/);
  }
});

Deno.test('API rejection is observable and does not reject the background task', async () => {
  const f = fixture({ fetch: async () => ({ ok: false, status: 401 }) });
  f.track('a', (events) => events.orderPaidConfirmed({ orderId: 'a', paymentId: '', gatewayOrderStatus: 'approved' }));
  await Promise.all(f.tasks);
  assert.ok(f.warnings.some(message => message.includes('(auth)')));
  assert.ok(f.warnings.every(message => !message.includes('wrk_test_server')));
});

Deno.test('server factories do not replace or drain the browser binding', () => {
  const browser: string[] = [];
  const server: string[] = [];
  bindWhisperr({ track: (event) => { browser.push(event); } });
  const events = createWhisperrEvents({ track: (event) => { server.push(event); } });
  events.orderPaidConfirmed({ orderId: 'a', paymentId: '', gatewayOrderStatus: 'approved' });
  WhisperrEvents.passwordResetCompleted({ resetOutcome: 'completed' });
  assert.deepEqual(browser, ['password_reset_completed']);
  assert.deepEqual(server, ['order_paid_confirmed']);
});

Deno.test('order lookup uses an exact account email match, excludes admins, and returns only an ID', async () => {
  const filters: unknown[][] = [];
  const fakeAdmin = {
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: (field: string, value: string) => { filters.push([table, field, value]); return chain; },
        ilike: (field: string, value: string) => { filters.push([table, field, value]); return chain; },
        maybeSingle: async () => ({ data: table === 'orders' ? { customer_email: 'customer_1%name@example.com' } : { id: 'customer-id' }, error: null }),
      };
      return chain;
    },
  };
  const id = await resolveOrderCustomerId(fakeAdmin as unknown as Parameters<typeof resolveOrderCustomerId>[0], 'order-id');
  assert.equal(id, 'customer-id');
  assert.deepEqual(filters, [
    ['orders', 'id', 'order-id'],
    ['profiles', 'email', 'customer\\_1\\%name@example.com'],
    ['profiles', 'role', 'customer'],
  ]);
});

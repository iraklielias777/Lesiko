// Captures live QuickShipper sandbox JSON into scripts/fixtures/quickshipper/.
// Redacts tokens, passwords, and phone numbers. Does nothing without credentials.
//
//   QS_USERNAME=… QS_PASSWORD=… node scripts/capture-quickshipper.mjs
//
// Optional: QS_AUTH_URL, QS_API_URL, QS_CLIENT_ID, QS_CLIENT_SECRET,
// QS_FROM_LAT, QS_FROM_LNG, QS_TO_LAT, QS_TO_LNG, and the matching street/city.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(here, 'fixtures/quickshipper');

const env = { ...process.env };
try {
  for (const line of readFileSync(join(root, '.env.local'), 'utf8').split('\n')) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    const key = line.slice(0, i).trim();
    if (env[key] == null) env[key] = line.slice(i + 1).trim();
  }
} catch {
  /* no .env.local */
}

const AUTH = (env.QS_AUTH_URL || 'https://test-auth.quickshipper.ge').replace(/\/+$/, '');
const API = (env.QS_API_URL || 'https://delivery-test.quickshipper.ge').replace(/\/+$/, '');
const CLIENT_ID = env.QS_CLIENT_ID || 'DeliveryApiClient';
const CLIENT_SECRET = env.QS_CLIENT_SECRET || 'DeliveryApiSecret';
const USERNAME = env.QS_USERNAME || '';
const PASSWORD = env.QS_PASSWORD || '';

const from = {
  street: env.QS_FROM_STREET || '38 Iakob Gogebashvili St, Tbilisi, Georgia',
  city: env.QS_FROM_CITY || 'Tbilisi',
  lat: env.QS_FROM_LAT || '41.703022188006344',
  lng: env.QS_FROM_LNG || '44.78220031738281',
};
const to = {
  street: env.QS_TO_STREET || '15 Irakli Abashidze Street, Tbilisi, Georgia',
  city: env.QS_TO_CITY || 'Tbilisi',
  lat: env.QS_TO_LAT || '41.7080523856428',
  lng: env.QS_TO_LNG || '44.77123544692993',
};

const redact = (value) => {
  const json = JSON.stringify(value, null, 2);
  return json
    .replace(/"(access_token|refresh_token|token)"\s*:\s*"[^"]*"/gi, '"$1": "REDACTED"')
    .replace(/("PhoneNumber"\s*:\s*")[^"]*"/gi, '$1REDACTED"')
    .replace(/("password"\s*:\s*")[^"]*"/gi, '$1REDACTED"');
};

const write = (name, value) => {
  writeFileSync(join(outDir, name), redact(value) + '\n');
  console.log('wrote', name);
};

if (!USERNAME || !PASSWORD) {
  console.log('Skip: set QS_USERNAME and QS_PASSWORD to capture live sandbox JSON.');
  console.log('Fixtures in scripts/fixtures/quickshipper/ stay as documented shapes.');
  process.exit(0);
}

const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
const tokenRes = await fetch(`${AUTH}/connect/token`, {
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
const tokenJson = await tokenRes.json().catch(() => ({}));
write('token.json', tokenJson);
if (!tokenJson.access_token) {
  console.error('Auth failed', tokenRes.status, tokenJson);
  process.exit(1);
}

const auth = { Authorization: `Bearer ${tokenJson.access_token}` };

const feeParams = new URLSearchParams({
  FromStreetName: from.street,
  FromCityName: from.city,
  FromLatitude: from.lat,
  FromLongitude: from.lng,
  ToStreetName: to.street,
  ToCityName: to.city,
  ToLatitude: to.lat,
  ToLongitude: to.lng,
});
const feesRes = await fetch(`${API}/v1/order/fees?${feeParams}`, { headers: auth });
const feesJson = await feesRes.json().catch(() => ({}));
write('fees.json', feesJson);

const providers = feesJson.providers || feesJson.Providers || feesJson.data || [];
const first = Array.isArray(providers) ? providers[0] : null;
const providerId = first?.providerId ?? first?.ProviderId;
if (first?.hasWeight || first?.HasWeight) {
  const weightParams = new URLSearchParams({
    FromLatitude: from.lat,
    FromLongitude: from.lng,
    ToLatitude: to.lat,
    ToLongitude: to.lng,
    ProviderId: String(providerId ?? ''),
  });
  const weightsRes = await fetch(`${API}/v1/Order/weights?${weightParams}`, { headers: auth });
  write('weights.json', await weightsRes.json().catch(() => ({})));
}

if (providerId != null) {
  const body = {
    Status: 'Draft',
    DeliveryType: 'ASAP',
    Channel: 'DeliveryApi',
    ProviderId: providerId,
    Comment: 'Lesiko capture script — delete me',
    FromStreetName: from.street,
    FromCityName: from.city,
    FromLatitude: Number(from.lat),
    FromLongitude: Number(from.lng),
    ToStreetName: to.street,
    ToCityName: to.city,
    ToLatitude: Number(to.lat),
    ToLongitude: Number(to.lng),
    AddressFrom: from.street,
    AddressTo: to.street,
    Customer: { Name: 'Capture Script', PhonePrefix: '995', PhoneNumber: '555000000' },
  };
  const createRes = await fetch(`${API}/v1/order`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const created = await createRes.json().catch(() => ({}));
  write('create-order.json', { request: body, response: created });

  const orderId = created.order?.id ?? created.order?.Id ?? created.OrderId ?? created.id;
  if (orderId) {
    const statusBody = { OrderId: orderId, Status: 'Cancelled' };
    const statusRes = await fetch(`${API}/v1/order/status`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(statusBody),
    });
    write('status.json', { request: statusBody, response: await statusRes.json().catch(() => ({})) });
  }
}

console.log('Capture complete. Diff the fixtures, then keep only non-secret field names.');

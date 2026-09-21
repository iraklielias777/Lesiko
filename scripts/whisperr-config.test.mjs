import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { assertWhisperrProductionConfig, browserWhisperrOptions } from '../lib/whisperr-config.ts';

test('production rejects the Next.js variable and server keys without leaking their values', () => {
  for (const env of [
    {},
    { NEXT_PUBLIC_WHISPERR_INGESTION_API_KEY: 'wpk_test_next_only' },
    { VITE_WHISPERR_INGESTION_API_KEY: 'wrk_test_private' },
  ]) {
    assert.throws(() => assertWhisperrProductionConfig({ VERCEL_ENV: 'production', ...env }), (error) => {
      assert.match(error.message, /VITE_WHISPERR_INGESTION_API_KEY/);
      assert.doesNotMatch(error.message, /test_next_only|test_private/);
      return true;
    });
  }
});

test('production accepts its public key and unconfigured development stays optional', () => {
  assert.doesNotThrow(() => assertWhisperrProductionConfig({ VERCEL_ENV: 'production', VITE_WHISPERR_INGESTION_API_KEY: ' wpk_test_browser ' }));
  assert.doesNotThrow(() => assertWhisperrProductionConfig({}));
  assert.doesNotThrow(() => assertWhisperrProductionConfig({ VERCEL_ENV: 'preview' }));
  assert.equal(browserWhisperrOptions(undefined).disabled, true);
  assert.equal(browserWhisperrOptions('wrk_test_private').disabled, true);
  assert.equal(browserWhisperrOptions(' wpk_test_browser ').apiKey, 'wpk_test_browser');
  assert.equal(browserWhisperrOptions('wpk_test_browser').disabled, false);
});

test('the deployed browser policy permits the configured ingestion origin without a wildcard', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const policies = config.headers.flatMap(rule => rule.headers)
    .filter(header => header.key.toLowerCase() === 'content-security-policy');
  assert.ok(policies.length > 0);
  for (const { value } of policies) {
    const connect = value.split(';').map(d => d.trim().split(/\s+/)).find(d => d[0] === 'connect-src');
    assert.ok(connect.includes(new URL(browserWhisperrOptions('wpk_test_browser').baseUrl).origin));
    assert.ok(!connect.includes('*'));
    assert.ok(!connect.includes('https:'));
  }
});

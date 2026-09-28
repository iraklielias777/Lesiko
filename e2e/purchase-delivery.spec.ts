import { expect, test } from '@playwright/test';
import {
  addInStockProduct,
  fillLabeled,
  fillShipping,
  GUEST,
  goToCheckout,
  mockDeliveryQuote,
  MOCK_QUOTES,
  stubPaymentStack,
  useEnglish,
  waitForStorefront,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
});

test('product page adds to bag and opens checkout', async ({ page }) => {
  await addInStockProduct(page);
  await page.getByRole('link', { name: /Proceed to Checkout/ }).click();
  await expect(page.getByRole('heading', { name: /Contact/ })).toBeVisible();
});

test('live delivery quote from checkout (fallback or courier list)', async ({ page, request }) => {
  const quoteRes = await request.post(
    (process.env.VITE_SUPABASE_URL || 'https://vhuagxhfmhzyfazbhwpx.supabase.co')
      + '/functions/v1/delivery/quote',
    {
      headers: {
        apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        Authorization: `Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      data: { address1: '15 Irakli Abashidze Street', city: 'Tbilisi' },
    },
  );
  const quoteJson = await quoteRes.json();
  expect(quoteRes.status()).toBeLessThan(500);
  expect(typeof quoteJson.configured).toBe('boolean');

  const captured: { quotes?: unknown[] } = { quotes: [] };
  await stubPaymentStack(page, captured);
  await goToCheckout(page);
  await fillShipping(page);

  await page.getByRole('button', { name: /Check delivery options|Continue to Payment/ }).click();

  const courier = page.getByRole('radio').first();
  if (quoteJson.configured && Array.isArray(quoteJson.quotes) && quoteJson.quotes.length > 0) {
    await expect(courier).toBeVisible();
    await courier.check();
    await page.getByRole('button', { name: 'Continue to Payment' }).click();
  }

  await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Pay GEL/)).toBeVisible();
  await expect(page.locator('#flitt-checkout')).toHaveAttribute('data-flitt-stub', '1', { timeout: 20_000 });
  expect(captured.quotes?.length).toBeGreaterThan(0);
  const pending = captured.quotes?.[0] as { p_order?: { shippingQuote?: { source?: string } } };
  expect(pending?.p_order?.shippingQuote?.source).toMatch(/quickshipper|fallback/);
});

test('mocked QuickShipper quotes: pick courier, persist snapshot, open payment', async ({ page }) => {
  const captured: { quotes?: unknown[] } = { quotes: [] };
  await mockDeliveryQuote(page, MOCK_QUOTES);
  await stubPaymentStack(page, captured);
  await goToCheckout(page);
  await fillShipping(page);

  await page.getByRole('button', { name: 'Check delivery options' }).click();
  await expect(page.getByText('Tb Delivery')).toBeVisible();
  await expect(page.getByText('Express Courier')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to Payment' })).toBeDisabled();

  await page.getByRole('radio', { name: /Tb Delivery/ }).check();
  await expect(page.getByRole('button', { name: 'Continue to Payment' })).toBeEnabled();
  await expect(page.locator('form').getByText('GEL\u00a08.50').or(page.locator('form').getByText('GEL 8.50'))).toBeVisible();

  await page.getByRole('button', { name: 'Continue to Payment' }).click();
  await expect(page.getByRole('heading', { name: 'Payment Method' })).toBeVisible();
  await expect(page.getByText(/Pay GEL/)).toBeVisible();
  await expect(page.locator('#flitt-checkout')).toHaveAttribute('data-flitt-stub', '1');

  const body = captured.quotes?.find((row) => row && typeof row === 'object') as {
    p_order?: { shippingQuote?: { source?: string; providerId?: number; fee?: number } };
  } | undefined;
  expect(body?.p_order?.shippingQuote?.source).toBe('quickshipper');
  expect(Number(body?.p_order?.shippingQuote?.providerId)).toBe(31);
  expect(Number(body?.p_order?.shippingQuote?.fee)).toBe(8.5);
});

test('unknown address blocks payment and does not create an order', async ({ page }) => {
  const captured: { quotes?: unknown[] } = { quotes: [] };
  await mockDeliveryQuote(page, {
    configured: true,
    quotes: [],
    error: 'We could not find that address — add a street number or landmark.',
    errorCode: 'address_not_found',
  }, 422);
  await stubPaymentStack(page, captured);
  await goToCheckout(page);
  await fillShipping(page, { address1: 'zzz-unknown-place' });

  await page.getByRole('button', { name: 'Check delivery options' }).click();
  await expect(page.getByText(/could not find that address|street number or landmark/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payment Method' })).toHaveCount(0);
  expect(captured.quotes?.length ?? 0).toBe(0);
});

test('track-order shows courier name and tracking link', async ({ page }) => {
  await stubPaymentStack(page);
  await page.goto('/track-order');
  await waitForStorefront(page);
  await fillLabeled(page, 'Order number', 'LKPLAYWR');
  await page.locator('input[type="email"]').fill(GUEST.email);
  await page.getByRole('button', { name: 'Find order' }).click();
  await expect(page.getByText('Tb Delivery')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Track shipment' })).toHaveAttribute(
    'href',
    'https://example.com/track/LKPLAYWR',
  );
});

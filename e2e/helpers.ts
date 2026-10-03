import { expect, type Page, type Route } from '@playwright/test';

export const GUEST = {
  email: `pw+${Date.now()}@example.com`,
  firstName: 'Nino',
  lastName: 'Beridze',
  phone: '555123123',
  address1: '15 Irakli Abashidze Street',
  address2: 'flat-61',
  city: 'Tbilisi',
  state: 'TB',
  zip: '0179',
};

export const MOCK_QUOTES = {
  configured: true,
  quotes: [
    {
      providerId: 31,
      providerName: 'Tb Delivery',
      logoUrl: null,
      fee: 8.5,
      etaMinutes: 45,
    },
    {
      providerId: 44,
      providerName: 'Express Courier',
      fee: 12,
      etaMinutes: 25,
    },
  ],
  lat: 41.708,
  lng: 44.771,
  fromLat: 41.703,
  fromLng: 44.782,
  fallbackFee: 15,
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

export async function useEnglish(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('lesiko-lang-chosen', '1');
  });
}

export async function waitForStorefront(page: Page) {
  await page.locator('#splash').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => undefined);
  await expect(page.locator('body')).toBeVisible();
  await expect(page.getByText('This page was never printed')).toHaveCount(0);
}

export async function fillLabeled(page: Page, label: string, value: string) {
  await page.locator('label').filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
    .locator('xpath=following::input[1]')
    .fill(value);
}

export async function fillShipping(page: Page, extra: Partial<typeof GUEST> = {}) {
  const data = { ...GUEST, ...extra };
  await fillLabeled(page, 'Email Address', data.email);
  await fillLabeled(page, 'First Name', data.firstName);
  await fillLabeled(page, 'Last Name', data.lastName);
  await fillLabeled(page, 'Phone', data.phone);
  await fillLabeled(page, 'Address', data.address1);
  await fillLabeled(page, 'Apartment, suite, etc. (optional)', data.address2);
  await fillLabeled(page, 'Zip Code', data.zip);
  await fillLabeled(page, 'City', data.city);
  await fillLabeled(page, 'State', data.state);
}

async function fetchInStockProduct() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY missing');
  const res = await fetch(
    `${url}/rest/v1/products?select=id,name,slug,price,compare_at_price,inventory_quantity,images,variants,brands(id,name,slug)&inventory_quantity=gt.0&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) throw new Error('No in-stock product in the catalogue');
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : undefined,
    inventoryQuantity: Number(row.inventory_quantity),
    images: Array.isArray(row.images) ? row.images : [],
    variants: row.variants,
    brand: row.brands || { id: 'brand', name: 'Brand', slug: 'brand' },
  };
}

export async function seedCartAndOpenCheckout(page: Page) {
  const product = await fetchInStockProduct();
  await page.addInitScript((item) => {
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('lesiko-lang-chosen', '1');
    localStorage.setItem('lesiko-cart-storage', JSON.stringify({
      state: { items: [item] },
      version: 0,
    }));
  }, {
    id: 'pw-cart-1',
    product,
    quantity: 1,
  });
  await page.goto('/cart');
  await waitForStorefront(page);
  await expect(page.getByRole('button', { name: /Request this order/ })).toBeVisible();
  await page.getByRole('button', { name: /Request this order/ }).click();
  await expect(page.getByRole('heading', { name: /Contact/ })).toBeVisible();
  await expect(page.getByText('Updating prices…')).toHaveCount(0, { timeout: 20_000 });
}

export async function addInStockProduct(page: Page) {
  const product = await fetchInStockProduct();
  await page.goto(`/product/${product.slug}`);
  await waitForStorefront(page);
  const add = page.getByRole('button', { name: /Add to Cart|დამატება/ }).first();
  await expect(add).toBeEnabled({ timeout: 25_000 });
  await add.click();
  await expect(page.getByRole('link', { name: /Request this order|შეკვეთის მოთხოვნა/ })).toBeVisible();
}

export async function goToCheckout(page: Page) {
  await seedCartAndOpenCheckout(page);
}

export async function stubPaymentStack(page: Page, captured: { quotes?: unknown[] } = {}) {
  await page.addInitScript(() => {
    window.checkout = (selector) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('data-flitt-stub', '1');
      return { on() { return this; }, $on() { return this; } };
    };
  });

  await page.route('**/functions/v1/payments/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/create-token')) {
      return json(route, {
        token: 'tok_playwright',
        orderId: '00000000-0000-4000-8000-000000000001',
        orderNumber: 'LKPLAYWR',
        amount: 2650,
        currency: 'GEL',
        total: 26.5,
        subtotal: 16.66,
        shipping: 8.5,
        tax: 1.34,
      });
    }
    if (url.includes('/order-status') || url.includes('/lookup')) {
      return json(route, {
        id: '00000000-0000-4000-8000-000000000001',
        orderNumber: 'LKPLAYWR',
        paymentStatus: 'paid',
        status: 'Processing',
        total: 26.5,
        shipping: 8.5,
        tax: 1.34,
        subtotal: 16.66,
        shippingAddress: GUEST,
        shippingQuote: { source: 'quickshipper', providerName: 'Tb Delivery', fee: 8.5 },
        qsTrackingUrl: 'https://example.com/track/LKPLAYWR',
        items: [],
      });
    }
    return route.continue();
  });

  await page.route('**/rest/v1/rpc/create_pending_order', async (route) => {
    const raw = route.request().postData() || '{}';
    try {
      captured.quotes?.push(JSON.parse(raw));
    } catch {
      captured.quotes?.push(raw);
    }
    return json(route, [{
      order_id: '00000000-0000-4000-8000-000000000001',
      public_token: '00000000-0000-4000-8000-000000000099',
    }]);
  });

  await page.route('https://pay.flitt.com/**', async (route) => {
    const url = route.request().url();
    if (url.endsWith('.css')) {
      return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.checkout = function (selector) {
          var el = document.querySelector(selector);
          if (el) el.setAttribute('data-flitt-stub', '1');
          return { on: function () { return this; }, $on: function () { return this; } };
        };
      `,
    });
  });
}

export async function mockDeliveryQuote(page: Page, body: unknown, status = 200) {
  await page.route('**/functions/v1/delivery/quote', (route) => json(route, body, status));
}

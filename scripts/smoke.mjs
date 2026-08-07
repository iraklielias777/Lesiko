// End-to-end smoke test against the live Supabase project.
// Walks the same paths the app takes: anon catalogue reads, guest checkout,
// admin sign-in, an admin write, and a media upload through the Edge Function.
//
//   node scripts/smoke.mjs <admin-email> <admin-password>

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const i = line.indexOf('=');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    })
);

const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const [, , ADMIN_EMAIL, ADMIN_PASSWORD] = process.argv;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// A dropped socket says nothing about the behaviour under test, and a single
// flake would otherwise be indistinguishable from a policy rejection.
const resilientFetch = async (input, init) => {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      lastError = e;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw lastError;
};

const clientOptions = {
  auth: { persistSession: false },
  global: { fetch: resilientFetch },
};

const anon = createClient(URL_, KEY, clientOptions);

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

// ---------------------------------------------------------- anon storefront

const { data: products, error: productsError } = await anon
  .from('products')
  .select('*, brands(*), categories(*)')
  .order('created_at', { ascending: false });
check('anon reads products with brand + category joins',
  !productsError && products?.some(p => p.brands && p.categories),
  productsError?.message);

const { data: settings } = await anon
  .from('site_content').select('content').eq('key', 'store_settings').maybeSingle();
check('anon reads store settings', !!settings?.content?.taxRate, JSON.stringify(settings?.content));

const { error: anonWriteError } = await anon
  .from('products').insert({ name: 'hack', slug: `hack-${Date.now()}` });
check('anon cannot write products', !!anonWriteError, anonWriteError?.code);

// ------------------------------------------------------------ guest checkout

const orderId = crypto.randomUUID();
const orderNumber = `SMOKE${Date.now().toString().slice(-6)}`;
const guestEmail = `smoke+${Date.now()}@example.com`;

const { error: orderError } = await anon.from('orders').insert({
  id: orderId,
  order_number: orderNumber,
  customer_email: guestEmail,
  customer_name: 'Smoke Test',
  shipping_address: {
    firstName: 'Smoke', lastName: 'Test', email: guestEmail,
    address1: '1 Test Way', city: 'Tbilisi', state: 'TB', zip: '0100', country: 'Georgia',
  },
  payment_status: 'paid', status: 'Processing',
  subtotal: 45, shipping: 15, tax: 3.6, total: 63.6,
});
check('guest can place an order', !orderError, orderError?.message);

const { error: itemsError } = await anon.from('order_items').insert([{
  order_id: orderId,
  product_id: products?.[0]?.id,
  product_name: products?.[0]?.name ?? 'Unknown',
  quantity: 1,
  price: 45,
}]);
check('guest can add order items', !itemsError, itemsError?.message);

const { data: leakedOrders } = await anon.from('orders').select('id');
check('anon cannot read other orders', (leakedOrders?.length ?? 0) === 0,
  `${leakedOrders?.length ?? 0} rows visible`);

// -------------------------------------------------------------------- admin

const admin = createClient(URL_, KEY, clientOptions);
const { data: session, error: signInError } = await admin.auth.signInWithPassword({
  email: ADMIN_EMAIL, password: ADMIN_PASSWORD,
});
check('admin can sign in', !signInError && !!session?.user, signInError?.message);

const { data: profile } = await admin
  .from('profiles').select('role, email').eq('id', session?.user?.id).maybeSingle();
check('admin profile has the admin role', profile?.role === 'admin', profile?.role);

const { data: adminOrders, error: adminOrdersError } = await admin
  .from('orders').select('*, order_items(*, products(slug, images))');
check('admin reads orders with line items',
  !adminOrdersError && adminOrders?.some(o => o.id === orderId && o.order_items?.length > 0),
  adminOrdersError?.message);

const { data: allProfiles } = await admin.from('profiles').select('email, role');
check('admin reads customer emails', allProfiles?.every(p => !!p.email),
  JSON.stringify(allProfiles));

// ------------------------------------------------- admin write: full product

const slug = `smoke-product-${Date.now()}`;
const { data: created, error: createError } = await admin.from('products').insert({
  name: 'Smoke Test Serum',
  name_ka: 'სატესტო შრატი',
  slug,
  description: 'Created by the smoke test.',
  description_ka: 'სატესტო აღწერა.',
  price: 19.99,
  compare_at_price: 29.99,
  inventory_quantity: 5,
  brand_id: products?.[0]?.brand_id,
  category_id: 'face-care',
  sub_category: 'serums',
  images: [{ id: 'a', url: 'https://example.com/a.jpg', altText: 'a', isPrimary: true }],
  variants: [{ id: 'v1', name: '30ml', inventoryQuantity: 5, sku: 'SMOKE-30' }],
  video_playback_id: 'abc123',
  is_new: true,
  is_trending: true,
  tags: ['smoke', 'dry'],
  meta_title: 'Smoke Test Serum',
  meta_description: 'meta description',
  meta_keywords: 'smoke, test',
}).select().single();

check('admin writes the full product shape',
  !createError &&
  created?.variants?.length === 1 &&
  created?.video_playback_id === 'abc123' &&
  created?.meta_title === 'Smoke Test Serum' &&
  created?.name_ka === 'სატესტო შრატი',
  createError?.message);

const { data: updated, error: updateError } = await admin
  .from('products')
  .update({ tags: ['smoke', 'oily'], sub_category: 'face-cream', is_new: false })
  .eq('id', created?.id).select().single();
check('admin update keeps tags and sub_category',
  !updateError && updated?.tags?.includes('oily') && updated?.sub_category === 'face-cream',
  updateError?.message);

// -------------------------------------------------- admin brands and orders

const brandSlug = `smoke-brand-${Date.now()}`;
const { data: brand, error: brandError } = await admin.from('brands')
  .insert({ name: 'Smoke Labs', slug: brandSlug, image: 'https://example.com/logo.png' })
  .select().single();
check('admin adds a brand', !brandError && brand?.slug === brandSlug, brandError?.message);

const { data: brandUpdated, error: brandUpdateError } = await admin.from('brands')
  .update({ name: 'Smoke Labs Renamed', description: 'Edited by the smoke test.', image: 'https://example.com/new.png' })
  .eq('slug', brandSlug).select().single();
check('admin edits a brand without changing its slug',
  !brandUpdateError &&
  brandUpdated?.name === 'Smoke Labs Renamed' &&
  brandUpdated?.description === 'Edited by the smoke test.' &&
  brandUpdated?.slug === brandSlug,
  brandUpdateError?.message);

const { data: statusUpdated, error: statusError } = await admin
  .from('orders').update({ status: 'Shipped' }).eq('id', orderId).select().single();
check('admin changes an order status', !statusError && statusUpdated?.status === 'Shipped',
  statusError?.message);

// ----------------------------------------------------- media Edge Function

// 1x1 transparent PNG
const pngBytes = Uint8Array.from(atob(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
), c => c.charCodeAt(0));

const form = new FormData();
form.append('file', new Blob([pngBytes], { type: 'image/png' }), 'smoke.png');
form.append('folder', 'products');

const { data: upload, error: uploadError } = await admin.functions.invoke('media', { body: form });
check('admin uploads through the media function', !!upload?.publicUrl,
  uploadError?.message || JSON.stringify(upload));

if (upload?.publicUrl) {
  const res = await fetch(upload.publicUrl);
  check('uploaded object is publicly readable', res.ok, `HTTP ${res.status}`);
}

const { data: fromUrl, error: fromUrlError } = await admin.functions.invoke('media', {
  body: { action: 'upload-from-url', folder: 'content', url: 'https://picsum.photos/64' },
});
check('admin uploads from a remote URL', !!fromUrl?.publicUrl,
  fromUrlError?.message || JSON.stringify(fromUrl));

// The browser compresses remote images itself, so the function has to hand
// back raw bytes plus the source type rather than storing them.
const fetchUrlRes = await resilientFetch(`${URL_}/functions/v1/media`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${session.session.access_token}`,
    apikey: KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ action: 'fetch-url', url: 'https://picsum.photos/64' }),
});
const fetchedBytes = fetchUrlRes.ok ? await fetchUrlRes.arrayBuffer() : new ArrayBuffer(0);
check('fetch-url returns image bytes for client-side compression',
  fetchUrlRes.ok &&
  fetchedBytes.byteLength > 100 &&
  (fetchUrlRes.headers.get('x-source-content-type') || '').startsWith('image/'),
  `HTTP ${fetchUrlRes.status}, ${fetchedBytes.byteLength} bytes, type ${fetchUrlRes.headers.get('x-source-content-type')}`);

// lib/image-compress.ts runs in the browser (OffscreenCanvas), so what is
// checkable from Node is the other half of the pipeline: the render endpoint
// that lib/image-url.ts points every <img> at has to return materially fewer
// bytes than the stored original.
const bigSource = await resilientFetch('https://picsum.photos/1600/1600');
const bigBytes = await bigSource.arrayBuffer();

const bigForm = new FormData();
bigForm.append('file', new Blob([bigBytes], { type: 'image/jpeg' }), 'large.jpg');
bigForm.append('folder', 'products');
const { data: bigUpload } = await admin.functions.invoke('media', { body: bigForm });

if (bigUpload?.publicUrl) {
  const rendered = await resilientFetch(
    `${bigUpload.publicUrl.replace('/object/public/', '/render/image/public/')}?width=400&quality=75`
  );
  const renderedBytes = rendered.ok ? (await rendered.arrayBuffer()).byteLength : Infinity;
  const ratio = bigBytes.byteLength / renderedBytes;
  check('render transform serves a materially smaller image than the original',
    rendered.ok && ratio >= 3,
    `${bigBytes.byteLength} B stored, ${renderedBytes} B served (${ratio.toFixed(1)}x)`);
} else {
  check('render transform serves a materially smaller image than the original', false,
    'upload failed');
}

// Anything that dodged compression must not be allowed to sit in the bucket.
const oversized = new FormData();
oversized.append('file', new Blob([new Uint8Array(3 * 1024 * 1024)], { type: 'image/png' }), 'big.png');
oversized.append('folder', 'products');
const { error: oversizedError } = await admin.functions.invoke('media', { body: oversized });
check('media function rejects an oversized upload', !!oversizedError, oversizedError?.message);

const { error: nonAdminUploadError } = await anon.functions.invoke('media', { body: form });
check('anon cannot upload through the media function', !!nonAdminUploadError,
  nonAdminUploadError?.message);

// ------------------------------------------------------- settings + content

const { data: currentSettings, error: settingsReadError } = await admin
  .from('site_content').select('content').eq('key', 'store_settings').single();
check('admin reads store settings back', !settingsReadError && !!currentSettings?.content,
  settingsReadError?.message);

const { error: settingsWriteError } = await admin
  .from('site_content')
  .upsert({ key: 'store_settings', content: { ...currentSettings?.content, taxRate: 0.11 } });
const { data: settingsAfter } = await anon
  .from('site_content').select('content').eq('key', 'store_settings').single();
check('admin persists store settings',
  !settingsWriteError && settingsAfter?.content?.taxRate === 0.11, settingsWriteError?.message);
if (currentSettings?.content) {
  await admin.from('site_content').upsert({ key: 'store_settings', content: currentSettings.content });
}

// --------------------------------------------------------- category deletes

const tempSlug = `smoke-cat-${Date.now()}`;
await admin.from('categories').insert({ slug: tempSlug, label: 'Smoke', subs: [], position: 99 });
const { data: existingCats } = await admin.from('categories').select('slug');
const keep = existingCats.map(c => c.slug).filter(s => s !== tempSlug);
const { error: catDeleteError } = await admin.from('categories').delete().in('slug', [tempSlug]);
const { data: catsAfter } = await anon.from('categories').select('slug');
check('a removed category stays deleted',
  !catDeleteError && !catsAfter.some(c => c.slug === tempSlug) && catsAfter.length === keep.length,
  catDeleteError?.message);

// ------------------------------------------------- taxonomy: rename is safe

// The whole point of moving sub_category to slugs: renaming the display label
// must leave every product in that subcategory attached.
const renameSlug = `smoke-tax-${Date.now()}`;
await admin.from('categories').insert({
  slug: renameSlug,
  label: 'Smoke Taxonomy',
  label_ka: 'სატესტო',
  subs: [{ slug: 'smoke-sub', label: 'Before Rename', labelKa: 'მანამდე' }],
  position: 98,
});

const { data: taxProduct } = await admin.from('products').insert({
  name: 'Smoke Taxonomy Product',
  slug: `${renameSlug}-product`,
  description: 'Attached to a subcategory that is about to be renamed.',
  price: 1,
  category_id: renameSlug,
  sub_category: 'smoke-sub',
}).select().single();

await admin.from('categories')
  .update({ subs: [{ slug: 'smoke-sub', label: 'After Rename', labelKa: 'შემდეგ' }] })
  .eq('slug', renameSlug);

const { data: taxAfter } = await anon
  .from('products').select('sub_category').eq('id', taxProduct?.id).maybeSingle();
const { data: renamedCat } = await anon
  .from('categories').select('subs').eq('slug', renameSlug).maybeSingle();

check('renaming a subcategory keeps its products attached',
  taxAfter?.sub_category === 'smoke-sub' && renamedCat?.subs?.[0]?.label === 'After Rename',
  `sub_category=${taxAfter?.sub_category}, label=${renamedCat?.subs?.[0]?.label}`);

const { data: taxonomyRows } = await anon.from('categories').select('slug, label_ka, subs');
const untranslated = (taxonomyRows || [])
  .filter(c => c.slug !== renameSlug)
  .flatMap(c => [
    ...(c.label_ka ? [] : [c.slug]),
    ...(c.subs || []).filter(s => !s.labelKa || !s.slug).map(s => `${c.slug}/${s.slug}`)
  ]);
check('every category and subcategory carries a Georgian label',
  untranslated.length === 0,
  untranslated.length ? untranslated.join(', ') : `${taxonomyRows.length - 1} categories checked`);

await admin.from('products').delete().eq('id', taxProduct?.id);
await admin.from('categories').delete().eq('slug', renameSlug);

// ------------------------------------------------------- catalogue coverage

const { data: allCategories } = await anon.from('categories').select('slug, subs');
const { data: allProducts } = await anon
  .from('products')
  .select('slug, category_id, sub_category, images, name_ka, meta_title, review_count, average_rating');

const uncovered = (allCategories || []).flatMap(c =>
  (c.subs || [])
    .filter(s => !(allProducts || []).some(p => p.category_id === c.slug && p.sub_category === s.slug))
    .map(s => `${c.slug}/${s.slug}`)
);
check('every subcategory has at least one product', uncovered.length === 0, uncovered.join(', '));

const phantomStars = (allProducts || [])
  .filter(p => (p.review_count > 0) !== (Number(p.average_rating) > 0))
  .map(p => p.slug);
check('no product advertises ratings it has not earned',
  phantomStars.length === 0,
  phantomStars.length ? phantomStars.join(', ') : `${allProducts?.length ?? 0} products checked`);

const underPopulated = (allProducts || [])
  .filter(p => !p.images?.length || !p.name_ka || !p.meta_title)
  .map(p => p.slug);
check('every product has an image, a Georgian name and SEO metadata',
  underPopulated.length === 0, underPopulated.join(', '));

// ------------------------------------------------------------- CMS content

for (const key of ['homepage_hero', 'help_content', 'footer_content', 'social_content']) {
  const { data: block } = await anon.from('site_content').select('content').eq('key', key).maybeSingle();
  check(`anon reads ${key}`, !!block?.content && Object.keys(block.content).length > 0);
}

const { data: heroBefore } = await admin
  .from('site_content').select('content').eq('key', 'homepage_hero').single();
await admin.from('site_content')
  .upsert({ key: 'homepage_hero', content: { ...heroBefore.content, title: 'Smoke Hero' } });
const { data: heroAfter } = await anon
  .from('site_content').select('content').eq('key', 'homepage_hero').single();
check('hero content round-trips through the CMS', heroAfter?.content?.title === 'Smoke Hero',
  heroAfter?.content?.title);
await admin.from('site_content').upsert({ key: 'homepage_hero', content: heroBefore.content });

// --------------------------------------------------------------- page SEO

const { data: seoPages } = await anon
  .from('site_content').select('content').eq('key', 'seo_pages').maybeSingle();
check('anon reads seo_pages',
  !!seoPages?.content?.defaults && !!seoPages?.content?.pages?.home,
  seoPages?.content ? Object.keys(seoPages.content.pages || {}).join(',') : 'missing');

const { data: seoBefore } = await admin
  .from('site_content').select('content').eq('key', 'seo_pages').single();
const smokeTitle = `Smoke Home ${Date.now()}`;
await admin.from('site_content').upsert({
  key: 'seo_pages',
  content: {
    ...seoBefore.content,
    pages: {
      ...seoBefore.content.pages,
      home: { ...seoBefore.content.pages.home, title: smokeTitle },
    },
  },
});
const { data: seoAfter } = await anon
  .from('site_content').select('content').eq('key', 'seo_pages').single();
check('seo_pages round-trips through the admin',
  seoAfter?.content?.pages?.home?.title === smokeTitle,
  seoAfter?.content?.pages?.home?.title);
await admin.from('site_content').upsert({ key: 'seo_pages', content: seoBefore.content });

const { data: settingsRow } = await anon
  .from('site_content').select('content').eq('key', 'store_settings').maybeSingle();
check('store settings expose siteUrl and ogImage keys',
  settingsRow?.content && 'siteUrl' in settingsRow.content && 'ogImage' in settingsRow.content,
  JSON.stringify({ siteUrl: settingsRow?.content?.siteUrl, ogImage: !!settingsRow?.content?.ogImage }));

// Category / brand meta columns from migration 0014
const { data: catMeta } = await anon.from('categories').select('slug, meta_title').limit(1).maybeSingle();
const { data: brandMeta } = await anon.from('brands').select('slug, meta_title').limit(1).maybeSingle();
check('categories carry meta_title', catMeta?.meta_title != null || catMeta?.slug,
  `${catMeta?.slug}: ${catMeta?.meta_title || '(null)'}`);
check('brands carry meta_title', brandMeta?.meta_title != null || brandMeta?.slug,
  `${brandMeta?.slug}: ${brandMeta?.meta_title || '(null)'}`);

// ----------------------------------------------- crawler edge function

const SEO_FN = `${URL_}/functions/v1/seo`;
const SMOKE_SITE_URL = 'https://smoke.lesiko.test';

// Sitemap and robots refuse to invent a host. Pin a temporary siteUrl for the
// edge-function checks, then restore whatever the store had before.
const { data: settingsBeforeSeo } = await admin
  .from('site_content').select('content').eq('key', 'store_settings').single();
await admin.from('site_content').upsert({
  key: 'store_settings',
  content: { ...settingsBeforeSeo.content, siteUrl: SMOKE_SITE_URL },
});

const robotsRes = await resilientFetch(`${SEO_FN}/robots.txt`);
const robotsText = await robotsRes.text();
check('seo edge function serves robots.txt',
  robotsRes.ok
    && robotsText.includes('Disallow: /admin')
    && robotsText.includes(`Sitemap: ${SMOKE_SITE_URL}/sitemap.xml`)
    && robotsText.includes('Disallow: /*?subCategory='),
  `status=${robotsRes.status}`);

const sitemapRes = await resilientFetch(`${SEO_FN}/sitemap.xml`);
const sitemapText = await sitemapRes.text();
const productSlugs = (allProducts || []).map(p => p.slug);
const missingFromSitemap = productSlugs.filter(slug => !sitemapText.includes(`/product/${slug}`));
check('seo edge function sitemap lists every product',
  sitemapRes.ok && sitemapText.includes('<urlset') && missingFromSitemap.length === 0,
  missingFromSitemap.length
    ? `missing ${missingFromSitemap.slice(0, 5).join(', ')}`
    : `${productSlugs.length} products in sitemap`);
check('seo sitemap uses only clean paths (no query filters)',
  sitemapRes.ok && !sitemapText.includes('?subCategory=') && !sitemapText.includes('?brands='),
  sitemapText.includes('?subCategory=') ? 'still contains ?subCategory=' : 'clean');
check('seo sitemap loc entries use the configured siteUrl',
  sitemapRes.ok && sitemapText.includes(`<loc>${SMOKE_SITE_URL}/`),
  SMOKE_SITE_URL);

const sampleSlug = productSlugs[0];
const renderRes = await resilientFetch(`${SEO_FN}/render?path=/product/${encodeURIComponent(sampleSlug)}`);
const renderHtml = await renderRes.text();
const sampleProduct = (allProducts || []).find(p => p.slug === sampleSlug);
check('seo edge function prerenders a product page',
  renderRes.ok
    && renderHtml.includes('<title>')
    && renderHtml.includes(sampleSlug)
    && (sampleProduct?.meta_title
      ? renderHtml.includes(sampleProduct.meta_title.split('|')[0].trim())
      : true),
  `status=${renderRes.status}, slug=${sampleSlug}`);

const homeRender = await resilientFetch(`${SEO_FN}/render?path=/`);
const homeHtml = await homeRender.text();
check('seo edge function prerenders the homepage with Organization schema',
  homeRender.ok && homeHtml.includes('Organization') && homeHtml.includes('SearchAction'),
  `status=${homeRender.status}`);

await admin.from('site_content').upsert({
  key: 'store_settings',
  content: settingsBeforeSeo.content,
});

// ---------------------------------------------------------------- addresses

const { data: address, error: addressError } = await admin.from('addresses').insert({
  user_id: session.user.id,
  first_name: 'Store', last_name: 'Admin', email: ADMIN_EMAIL,
  address1: '1 Test Way', city: 'Tbilisi', state: 'TB', zip: '0100', country: 'Georgia',
  is_default: true,
}).select().single();
check('user saves an address', !addressError && address?.is_default === true, addressError?.message);

const { data: ownAddresses } = await admin
  .from('addresses').select('*').eq('user_id', session.user.id);
check('user reads back their own addresses', ownAddresses?.length === 1,
  `${ownAddresses?.length ?? 0} rows`);

const { data: leakedAddresses } = await anon.from('addresses').select('id');
check('anon cannot read addresses', (leakedAddresses?.length ?? 0) === 0,
  `${leakedAddresses?.length ?? 0} rows visible`);

await admin.from('addresses').delete().eq('id', address?.id);

// ----------------------------------------------------------------- cleanup

for (const path of [upload?.path, fromUrl?.path, bigUpload?.path].filter(Boolean)) {
  await admin.functions.invoke('media', { body: { action: 'delete', path } });
}
await admin.from('products').delete().eq('id', created?.id);
await admin.from('orders').delete().eq('id', orderId);
await admin.from('brands').delete().eq('slug', brandSlug);
await admin.auth.signOut();

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);

// Everything a crawler needs that a client-rendered SPA cannot provide.
//
// Facebook, WhatsApp, Slack, Telegram and LinkedIn never run JavaScript, so a
// shared product link previewed with the bundle's static index.html title and
// no image. Google does render, but slowly and not always. This function serves
// the same content those clients would eventually see, as plain HTML:
//
//   GET /robots.txt      crawl rules plus a pointer to the sitemap
//   GET /sitemap.xml     every product, category, sub-category and brand
//   GET /render?path=... a complete document for one storefront path
//
// It only reads rows that are already public through RLS, so it runs with
// verify_jwt disabled and the anon key. No service role, no auth gate.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  ResolvedSeo,
  SeoPages,
  pickLang,
  plainText,
  resolveEntitySeo,
  resolvePageSeo,
  richTextExcerpt,
  richTextToHtml
} from './seo-core.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const FALLBACK_SITE_URL = Deno.env.get('SITE_URL') ?? '';

const db = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const DEFAULT_SEO: SeoPages = {
  titleTemplate: '%s | %site%',
  robotsExtra: '',
  verification: {},
  defaults: {
    title: 'Cosmetics & Skincare',
    description: '',
    keywords: '',
    ogImage: '',
    noindex: false
  },
  pages: {}
};

interface SiteConfig {
  seo: SeoPages;
  storeName: string;
  siteUrl: string;
  ogImage: string;
  currency: string;
  supportEmail: string;
  /** Language bots see when the request carries no ?lang — Admin → Settings. */
  defaultLanguage: 'en' | 'ka';
}

// Paths that exist but are not worth a crawl budget, and paths that would leak
// a signed-in view if a crawler ever reached them.
const DISALLOWED = ['/admin', '/cart', '/checkout', '/account', '/order-confirmation'];

const STATIC_ROUTES: { path: string; key: string; priority: string; changefreq: string }[] = [
  { path: '/', key: 'home', priority: '1.0', changefreq: 'daily' },
  { path: '/products', key: 'products', priority: '0.9', changefreq: 'daily' },
  { path: '/sale', key: 'sale', priority: '0.8', changefreq: 'daily' },
  { path: '/brands', key: 'brands', priority: '0.6', changefreq: 'weekly' },
  { path: '/help', key: 'help', priority: '0.4', changefreq: 'monthly' },
  { path: '/terms', key: 'terms', priority: '0.3', changefreq: 'monthly' },
  { path: '/privacy', key: 'privacy', priority: '0.3', changefreq: 'monthly' },
  { path: '/delivery', key: 'delivery', priority: '0.4', changefreq: 'monthly' },
  { path: '/returns', key: 'returns', priority: '0.4', changefreq: 'monthly' }
];

// Editable long-form pages served from the `legal_pages` content block.
const LEGAL_KEYS = ['terms', 'privacy', 'delivery', 'returns'];
const LEGAL_TITLES: Record<string, { en: string; ka: string }> = {
  terms: { en: 'Terms of Service', ka: 'მომსახურების პირობები' },
  privacy: { en: 'Privacy Policy', ka: 'კონფიდენციალურობის პოლიტიკა' },
  delivery: { en: 'Delivery', ka: 'მიწოდება' },
  returns: { en: 'Returns & Refunds', ka: 'დაბრუნება და თანხის უკან დაბრუნება' }
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeXml = escapeHtml;

/**
 * The configured origin wins. Behind a Vercel rewrite the request host is this
 * function (`*.supabase.co`), which must never appear in sitemap/canonical
 * URLs — those would point crawlers at an address shoppers cannot open.
 */
const isSupabaseHost = (host: string) => /\.supabase\.co$/i.test(host);

const httpsOrigin = (host: string) => {
  const clean = host.split(',')[0].trim().replace(/:\d+$/, '');
  return clean && !isSupabaseHost(clean) ? `https://${clean}` : '';
};

const resolveSiteUrl = (configured: string, req: Request): string => {
  const explicit = (configured || FALLBACK_SITE_URL).trim().replace(/\/+$/, '');
  if (explicit) return explicit;

  const forwarded = httpsOrigin(req.headers.get('x-forwarded-host') || '');
  if (forwarded) return forwarded;

  // Crawlers rarely send Origin; Referer can still carry the storefront host
  // when the rewrite came through a proxy that preserved it.
  for (const header of ['origin', 'referer'] as const) {
    const raw = req.headers.get(header);
    if (!raw) continue;
    try {
      const host = new URL(raw).host;
      const origin = httpsOrigin(host);
      if (origin) return origin;
    } catch {
      /* ignore malformed */
    }
  }

  const reqHost = new URL(req.url).host;
  if (!isSupabaseHost(reqHost)) {
    return new URL(req.url).origin.replace(/^http:/, 'https:');
  }

  // Prefer an empty string over publishing supabase.co canonicals. robots and
  // sitemap callers treat that as "not ready" rather than lying about the host.
  return '';
};

const loadConfig = async (req: Request): Promise<SiteConfig> => {
  const { data } = await db
    .from('site_content')
    .select('key, content')
    .in('key', ['seo_pages', 'store_settings']);

  const blocks = Object.fromEntries((data || []).map(row => [row.key, row.content ?? {}]));
  const settings = blocks.store_settings ?? {};
  const stored = blocks.seo_pages ?? {};

  const seo: SeoPages = {
    ...DEFAULT_SEO,
    ...stored,
    defaults: { ...DEFAULT_SEO.defaults, ...(stored.defaults ?? {}) },
    verification: { ...(stored.verification ?? {}) },
    pages: stored.pages ?? {}
  };

  return {
    seo,
    storeName: settings.storeName || 'LesiKo',
    siteUrl: resolveSiteUrl(settings.siteUrl || '', req),
    ogImage: settings.ogImage || '',
    currency: settings.currency || 'USD',
    supportEmail: settings.supportEmail || '',
    defaultLanguage: settings.defaultLanguage === 'ka' ? 'ka' : 'en'
  };
};

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

const robots = (config: SiteConfig): Response => {
  const lines = [
    'User-agent: *',
    ...DISALLOWED.map(path => `Disallow: ${path}`),
    // Filtered listings are canonicalised back to the unfiltered page, so there
    // is nothing to gain from crawling every combination of them.
    'Disallow: /*?q=',
    'Disallow: /*?skinType=',
    'Disallow: /*?subCategory=',
    'Disallow: /*?brands=',
    'Allow: /',
  ];

  if (config.siteUrl) {
    lines.push('', `Sitemap: ${config.siteUrl}/sitemap.xml`);
  }

  const extra = (config.seo.robotsExtra || '').trim();
  if (extra) lines.push('', extra);

  return new Response(`${lines.join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400'
    }
  });
};

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------

const sitemap = async (config: SiteConfig): Promise<Response> => {
  // Without a real storefront origin every <loc> would be wrong; fail closed
  // so crawlers retry later instead of indexing supabase.co URLs.
  if (!config.siteUrl) {
    return new Response('siteUrl is not configured. Set it under Admin → SEO.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '3600'
      }
    });
  }

  const [products, categories, brands] = await Promise.all([
    db.from('products').select('slug, updated_at').order('updated_at', { ascending: false }),
    db.from('categories').select('slug, updated_at').order('position'),
    db.from('brands').select('slug, updated_at, products(count)').order('name')
  ]);

  const entries: string[] = [];
  const add = (path: string, lastmod?: string | null, changefreq = 'weekly', priority = '0.5') => {
    entries.push(
      [
        '  <url>',
        `    <loc>${escapeXml(config.siteUrl + (path === '/' ? '/' : path))}</loc>`,
        lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>'
      ].filter(Boolean).join('\n')
    );
  };

  for (const route of STATIC_ROUTES) {
    // A page the admin marked noindex has no business in the sitemap.
    if (config.seo.pages?.[route.key]?.noindex) continue;
    add(route.path, null, route.changefreq, route.priority);
  }

  // Only clean paths. Query-filtered subcategory URLs are disallowed in robots
  // and the Vercel bot rewrite cannot fold ?subCategory= into path= reliably,
  // so listing them here would create sitemap/prerender mismatches.
  for (const category of categories.data || []) {
    add(`/category/${category.slug}`, category.updated_at, 'weekly', '0.8');
  }

  for (const brand of brands.data || []) {
    // An empty brand is an admin placeholder; the storefront hides it too.
    if ((brand.products?.[0]?.count ?? 1) === 0) continue;
    add(`/brand/${brand.slug}`, brand.updated_at, 'weekly', '0.6');
  }

  for (const product of products.data || []) {
    add(`/product/${product.slug}`, product.updated_at, 'weekly', '0.9');
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    ''
  ].join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=3600'
    }
  });
};

// ---------------------------------------------------------------------------
// /render — a real document for one path
// ---------------------------------------------------------------------------

interface Rendered {
  seo: ResolvedSeo;
  canonicalPath: string;
  heading: string;
  body: string;
  schema?: object | object[];
  status?: number;
}

const absolute = (config: SiteConfig, path: string) =>
  `${config.siteUrl}${path === '/' ? '/' : path}`;

const linkList = (config: SiteConfig, links: { href: string; label: string }[]) =>
  links.length
    ? `<ul>${links
        .map(l => `<li><a href="${escapeHtml(absolute(config, l.href))}">${escapeHtml(l.label)}</a></li>`)
        .join('')}</ul>`
    : '';

const productCard = (config: SiteConfig, product: any, isKa: boolean) => {
  const name = pickLang(product.name, product.name_ka, isKa);
  const image = Array.isArray(product.images) ? product.images[0]?.url : undefined;
  return [
    '<li>',
    `<a href="${escapeHtml(absolute(config, `/product/${product.slug}`))}">`,
    image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" width="200" />` : '',
    `<span>${escapeHtml(name)}</span>`,
    '</a>',
    product.price != null ? `<span>${escapeHtml(String(product.price))} ${escapeHtml(config.currency)}</span>` : '',
    '</li>'
  ].join('');
};

const renderProduct = async (config: SiteConfig, slug: string, isKa: boolean): Promise<Rendered | null> => {
  const { data } = await db
    .from('products')
    .select('*, brands(name, slug), categories(slug, label, label_ka)')
    .eq('slug', slug)
    .maybeSingle();

  if (!data) return null;

  const name = pickLang(data.name, data.name_ka, isKa);
  const description = plainText(pickLang(data.description, data.description_ka, isKa));
  const brandName = data.brands?.name || '';
  const categoryLabel = pickLang(data.categories?.label, data.categories?.label_ka, isKa);
  const images: string[] = Array.isArray(data.images) ? data.images.map((i: any) => i.url).filter(Boolean) : [];
  const canonicalPath = `/product/${data.slug}`;

  const seo = resolveEntitySeo(
    {
      metaTitle: data.meta_title,
      metaTitleKa: data.meta_title_ka,
      metaDescription: data.meta_description,
      metaDescriptionKa: data.meta_description_ka,
      metaKeywords: data.meta_keywords
    },
    config.seo,
    {
      isKa,
      storeName: config.storeName,
      ogImage: config.ogImage,
      generatedTitle: brandName ? `${name} | ${brandName}` : name,
      generatedDescription: description,
      generatedKeywords: [brandName, categoryLabel, ...(data.tags || [])].filter(Boolean).join(', '),
      image: images[0]
    }
  );

  const schema = [
    {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name,
      image: images,
      description,
      brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
      sku: data.id,
      offers: {
        '@type': 'Offer',
        url: absolute(config, canonicalPath),
        priceCurrency: config.currency,
        price: data.price,
        availability: (data.inventory_quantity || 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition'
      },
      aggregateRating: Number(data.average_rating) > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: data.average_rating,
            reviewCount: data.review_count || 1
          }
        : undefined
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absolute(config, '/') },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: absolute(config, '/products') },
        ...(data.categories?.slug
          ? [{
              '@type': 'ListItem',
              position: 3,
              name: categoryLabel,
              item: absolute(config, `/category/${data.categories.slug}`)
            }]
          : []),
        { '@type': 'ListItem', position: 4, name, item: absolute(config, canonicalPath) }
      ]
    }
  ];

  const body = [
    images[0] ? `<img src="${escapeHtml(images[0])}" alt="${escapeHtml(name)}" width="600" />` : '',
    brandName
      ? `<p><a href="${escapeHtml(absolute(config, `/brand/${data.brands.slug}`))}">${escapeHtml(brandName)}</a></p>`
      : '',
    `<p><strong>${escapeHtml(String(data.price))} ${escapeHtml(config.currency)}</strong></p>`,
    `<p>${escapeHtml(description)}</p>`,
    data.categories?.slug
      ? linkList(config, [{ href: `/category/${data.categories.slug}`, label: categoryLabel }])
      : ''
  ].join('\n');

  return { seo, canonicalPath, heading: name, body, schema };
};

const renderListing = async (
  config: SiteConfig,
  opts: { categorySlug?: string; subSlug?: string; brandSlug?: string; sale?: boolean; pageKey: string; canonicalPath: string },
  isKa: boolean
): Promise<Rendered | null> => {
  let query = db
    .from('products')
    .select('slug, name, name_ka, price, images, categories!inner(slug), brands!inner(slug)')
    .limit(48);

  let entity: Record<string, string | undefined> = {};
  let heading = '';
  let generatedDescription = '';

  if (opts.categorySlug) {
    const { data: category } = await db
      .from('categories')
      .select('*')
      .eq('slug', opts.categorySlug)
      .maybeSingle();
    if (!category) return null;

    heading = pickLang(category.label, category.label_ka, isKa);
    query = query.eq('categories.slug', opts.categorySlug);

    if (opts.subSlug) {
      const subs = Array.isArray(category.subs) ? category.subs : [];
      const sub = subs.find((s: any) => (typeof s === 'string' ? false : s?.slug === opts.subSlug));
      if (!sub) return null;
      heading = pickLang(sub.label, sub.labelKa, isKa);
      query = query.eq('sub_category', opts.subSlug);
      entity = {
        metaTitle: sub.metaTitle,
        metaTitleKa: sub.metaTitleKa,
        metaDescription: sub.metaDescription,
        metaDescriptionKa: sub.metaDescriptionKa,
        metaKeywords: sub.metaKeywords
      };
    } else {
      entity = {
        metaTitle: category.meta_title,
        metaTitleKa: category.meta_title_ka,
        metaDescription: category.meta_description,
        metaDescriptionKa: category.meta_description_ka,
        metaKeywords: category.meta_keywords
      };
    }
    generatedDescription = `Shop ${heading} at ${config.storeName}.`;
  } else if (opts.brandSlug) {
    const { data: brand } = await db
      .from('brands')
      .select('*')
      .eq('slug', opts.brandSlug)
      .maybeSingle();
    if (!brand) return null;

    heading = brand.name;
    generatedDescription = brand.description || `Shop the ${brand.name} range at ${config.storeName}.`;
    query = query.eq('brands.slug', opts.brandSlug);
    entity = {
      metaTitle: brand.meta_title,
      metaTitleKa: brand.meta_title_ka,
      metaDescription: brand.meta_description,
      metaDescriptionKa: brand.meta_description_ka,
      metaKeywords: brand.meta_keywords
    };
  } else if (opts.sale) {
    // Same predicate the storefront uses: a genuine discount, not merely a
    // populated compare-at field. See migration 0018.
    query = query.eq('is_on_sale', true);
  }

  const { data: products } = await query;
  const rows = products || [];

  const hasEntity = Object.values(entity).some(Boolean) || !!heading;
  const seo = hasEntity
    ? resolveEntitySeo(entity, config.seo, {
        isKa,
        storeName: config.storeName,
        ogImage: config.ogImage,
        generatedTitle: heading,
        generatedDescription
      })
    : resolvePageSeo(config.seo, opts.pageKey, {
        isKa,
        storeName: config.storeName,
        ogImage: config.ogImage
      });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: heading || seo.title,
    numberOfItems: rows.length,
    itemListElement: rows.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absolute(config, `/product/${product.slug}`),
      name: pickLang(product.name, product.name_ka, isKa)
    }))
  };

  const body = [
    `<p>${escapeHtml(seo.description)}</p>`,
    rows.length ? `<ul>${rows.map(p => productCard(config, p, isKa)).join('')}</ul>` : '<p>No products yet.</p>'
  ].join('\n');

  return { seo, canonicalPath: opts.canonicalPath, heading: heading || seo.title, body, schema };
};

const renderStatic = async (
  config: SiteConfig,
  pageKey: string,
  canonicalPath: string,
  isKa: boolean
): Promise<Rendered> => {
  const seo = resolvePageSeo(config.seo, pageKey, {
    isKa,
    storeName: config.storeName,
    ogImage: config.ogImage
  });

  if (pageKey === 'home') {
    const [{ data: categories }, { data: products }] = await Promise.all([
      db.from('categories').select('slug, label, label_ka').order('position'),
      // Trending first, then newest — the same fallback the storefront rail
      // uses, so a catalogue with nothing flagged still renders a list.
      db.from('products').select('slug, name, name_ka, price, images')
        .order('is_trending', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12)
    ]);

    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${config.siteUrl}/#organization`,
          name: config.storeName,
          url: absolute(config, '/'),
          ...(config.ogImage ? { logo: config.ogImage } : {}),
          ...(config.supportEmail
            ? {
                contactPoint: {
                  '@type': 'ContactPoint',
                  contactType: 'customer support',
                  email: config.supportEmail
                }
              }
            : {})
        },
        {
          '@type': 'WebSite',
          '@id': `${config.siteUrl}/#website`,
          name: config.storeName,
          url: absolute(config, '/'),
          inLanguage: isKa ? 'ka-GE' : 'en-US',
          publisher: { '@id': `${config.siteUrl}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${config.siteUrl}/products?q={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
          }
        }
      ]
    };

    const body = [
      `<p>${escapeHtml(seo.description)}</p>`,
      '<h2>Shop by category</h2>',
      linkList(
        config,
        (categories || []).map(c => ({
          href: `/category/${c.slug}`,
          label: pickLang(c.label, c.label_ka, isKa)
        }))
      ),
      '<h2>Trending</h2>',
      (products || []).length
        ? `<ul>${(products || []).map(p => productCard(config, p, isKa)).join('')}</ul>`
        : ''
    ].join('\n');

    return { seo, canonicalPath, heading: config.storeName, body, schema };
  }

  if (pageKey === 'help') {
    const { data } = await db
      .from('site_content')
      .select('content')
      .eq('key', 'help_content')
      .maybeSingle();

    const faqs: any[] = data?.content?.faqs || [];
    const localised = faqs
      .map(f => ({
        question: pickLang(f.question, f.questionKa, isKa),
        answer: plainText(pickLang(f.answer, f.answerKa, isKa))
      }))
      .filter(f => f.question && f.answer);

    const schema = localised.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: localised.map(f => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer }
          }))
        }
      : undefined;

    const body = [
      `<p>${escapeHtml(seo.description)}</p>`,
      ...localised.map(f => `<h2>${escapeHtml(f.question)}</h2><p>${escapeHtml(f.answer)}</p>`)
    ].join('\n');

    return { seo, canonicalPath, heading: seo.title, body, schema };
  }

  if (LEGAL_KEYS.includes(pageKey)) {
    const { data } = await db
      .from('site_content')
      .select('content')
      .eq('key', 'legal_pages')
      .maybeSingle();

    const pages: any[] = Array.isArray(data?.content?.pages) ? data.content.pages : [];
    const page = pages.find(p => p?.key === pageKey);
    const fill = (value: string) =>
      value.replace(/\{store\}/g, config.storeName).replace(/\{email\}/g, config.supportEmail);
    const title = page
      ? fill(pickLang(page.title, page.titleKa, isKa))
      : (isKa ? LEGAL_TITLES[pageKey].ka : LEGAL_TITLES[pageKey].en);
    const text = page ? fill(pickLang(page.body, page.bodyKa, isKa)) : '';

    const legalSeo = resolvePageSeo(config.seo, pageKey, {
      isKa,
      storeName: config.storeName,
      ogImage: config.ogImage,
      fallbackTitle: title,
      fallbackDescription: richTextExcerpt(text)
    });

    return { seo: legalSeo, canonicalPath, heading: title, body: richTextToHtml(text) };
  }

  if (pageKey === 'brands') {
    const { data: brands } = await db.from('brands').select('slug, name, description').order('name');
    const body = [
      `<p>${escapeHtml(seo.description)}</p>`,
      linkList(config, (brands || []).map(b => ({ href: `/brand/${b.slug}`, label: b.name })))
    ].join('\n');

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: seo.title,
      numberOfItems: (brands || []).length,
      itemListElement: (brands || []).map((b, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absolute(config, `/brand/${b.slug}`),
        name: b.name
      }))
    };

    return { seo, canonicalPath, heading: seo.title, body, schema };
  }

  return { seo, canonicalPath, heading: seo.title, body: `<p>${escapeHtml(seo.description)}</p>` };
};

const document = (config: SiteConfig, rendered: Rendered, isKa: boolean): string => {
  const { seo } = rendered;
  const canonical = absolute(config, rendered.canonicalPath);
  const schemas = rendered.schema
    ? (Array.isArray(rendered.schema) ? rendered.schema : [rendered.schema])
    : [];

  const meta = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    seo.keywords ? `<meta name="keywords" content="${escapeHtml(seo.keywords)}" />` : '',
    `<meta name="robots" content="${seo.noindex ? 'noindex, nofollow' : 'index, follow'}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(config.storeName)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:locale" content="${isKa ? 'ka_GE' : 'en_US'}" />`,
    seo.image ? `<meta property="og:image" content="${escapeHtml(seo.image)}" />` : '',
    `<meta name="twitter:card" content="${seo.image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
    seo.image ? `<meta name="twitter:image" content="${escapeHtml(seo.image)}" />` : '',
    config.seo.verification.google
      ? `<meta name="google-site-verification" content="${escapeHtml(config.seo.verification.google)}" />`
      : '',
    config.seo.verification.facebookDomain
      ? `<meta name="facebook-domain-verification" content="${escapeHtml(config.seo.verification.facebookDomain)}" />`
      : ''
  ].filter(Boolean).join('\n    ');

  return `<!DOCTYPE html>
<html lang="${isKa ? 'ka' : 'en'}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${meta}
    ${schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n    ')}
  </head>
  <body>
    <h1>${escapeHtml(rendered.heading)}</h1>
    ${rendered.body}
    <nav>
      <a href="${escapeHtml(absolute(config, '/'))}">Home</a>
      <a href="${escapeHtml(absolute(config, '/products'))}">Shop</a>
      <a href="${escapeHtml(absolute(config, '/brands'))}">Brands</a>
      <a href="${escapeHtml(absolute(config, '/help'))}">Help</a>
    </nav>
  </body>
</html>
`;
};

/** Maps a storefront path onto the renderer that knows how to describe it. */
const render = async (config: SiteConfig, rawPath: string, isKa: boolean): Promise<Response> => {
  const [pathname, search] = rawPath.split('?');
  const params = new URLSearchParams(search || '');
  const segments = pathname.split('/').filter(Boolean);

  let rendered: Rendered | null = null;
  let status = 200;

  if (segments.length === 0) {
    rendered = await renderStatic(config, 'home', '/', isKa);
  } else if (segments[0] === 'product' && segments[1]) {
    rendered = await renderProduct(config, segments[1], isKa);
  } else if (segments[0] === 'category' && segments[1]) {
    const subSlug = params.get('subCategory') || undefined;
    rendered = await renderListing(
      config,
      {
        categorySlug: segments[1],
        subSlug,
        pageKey: 'products',
        canonicalPath: subSlug
          ? `/category/${segments[1]}?subCategory=${subSlug}`
          : `/category/${segments[1]}`
      },
      isKa
    );
  } else if (segments[0] === 'brand' && segments[1]) {
    rendered = await renderListing(
      config,
      { brandSlug: segments[1], pageKey: 'brands', canonicalPath: `/brand/${segments[1]}` },
      isKa
    );
  } else if (segments[0] === 'products') {
    rendered = await renderListing(config, { pageKey: 'products', canonicalPath: '/products' }, isKa);
  } else if (segments[0] === 'sale') {
    rendered = await renderListing(config, { sale: true, pageKey: 'sale', canonicalPath: '/sale' }, isKa);
  } else if (segments[0] === 'brands') {
    rendered = await renderStatic(config, 'brands', '/brands', isKa);
  } else if (segments[0] === 'help') {
    rendered = await renderStatic(config, 'help', '/help', isKa);
  } else if (segments.length === 1 && LEGAL_KEYS.includes(segments[0])) {
    rendered = await renderStatic(config, segments[0], `/${segments[0]}`, isKa);
  } else if (['login', 'register', 'wishlist'].includes(segments[0])) {
    rendered = await renderStatic(config, segments[0], `/${segments[0]}`, isKa);
  }

  if (!rendered) {
    // A crawler asking for a URL that no longer resolves must be told so, or the
    // dead page stays in the index indefinitely.
    rendered = await renderStatic(config, 'notFound', pathname || '/404', isKa);
    rendered.seo.noindex = true;
    status = 404;
  }

  return new Response(document(config, rendered, isKa), {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'X-Robots-Tag': rendered.seo.noindex ? 'noindex' : 'all'
    }
  });
};

Deno.serve(async req => {
  const url = new URL(req.url);
  // Supabase mounts the function at /functions/v1/seo; Vercel rewrites strip
  // nothing, so match on the tail of the path either way.
  const route = url.pathname.replace(/^.*\/seo/, '') || '/';

  try {
    const config = await loadConfig(req);
    const langParam = (url.searchParams.get('lang') || '').toLowerCase();
    const isKa = langParam ? langParam === 'ka' : config.defaultLanguage === 'ka';

    if (route.startsWith('/robots')) return robots(config);
    if (route.startsWith('/sitemap')) return await sitemap(config);
    if (route.startsWith('/render')) {
      return await render(config, url.searchParams.get('path') || '/', isKa);
    }

    return new Response('Not found. Try /robots.txt, /sitemap.xml or /render?path=/', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  } catch (error) {
    console.error('seo function failed', error);
    // Returning an error page to a crawler is worse than returning nothing, so
    // fail in a way the SPA fallback can take over from.
    return new Response('Temporarily unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '120' }
    });
  }
});

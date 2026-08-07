import type { EntitySeo, PageSeo, SeoPages, StoreSettings } from '../types';

/**
 * One place where "which string actually ends up in the <title>" is decided.
 *
 * The order is always: what the admin typed for this exact thing, then what we
 * can generate from the row, then the site-wide default. Every consumer -- the
 * SEO component, the sitemap and the crawler prerender -- goes through here so
 * a page cannot end up with a title in the browser and a different one in a
 * Facebook preview.
 *
 * The equivalent for the Deno runtime lives in supabase/functions/seo/seo-core.ts.
 */

export interface ResolvedSeo {
  title: string;
  description: string;
  keywords: string;
  image?: string;
  noindex: boolean;
}

const clean = (value?: string | null) => (value && value.trim() ? value.trim() : '');

/** Georgian when we have it, English otherwise -- never an empty Georgian field. */
export const pickLang = (en?: string | null, ka?: string | null, isKa = false): string =>
  (isKa ? clean(ka) || clean(en) : clean(en) || clean(ka));

/** Applies the admin-defined title template, skipping it if already branded. */
export const applyTitleTemplate = (
  template: string,
  title: string,
  siteName: string
): string => {
  if (!title) return siteName;
  const site = clean(siteName);
  if (!site || title.includes(site)) return title;

  // A meta title the admin already branded ("Serum | LesiKo") must not get
  // branded a second time just because settings spell the store name out more
  // fully ("LesiKo Cosmetics").
  const parts = title.split('|');
  if (parts.length > 1) {
    const tail = parts[parts.length - 1].trim().toLowerCase();
    if (tail && site.toLowerCase().startsWith(tail)) return title;
  }

  const pattern = clean(template) || '%s | %site%';
  return pattern.replace('%s', title).replace('%site%', site);
};

/**
 * Absolute URL for a storefront path. Prefers the configured origin because a
 * preview deployment must not emit canonicals pointing at itself.
 */
export const absoluteUrl = (siteUrl: string, path: string): string => {
  const origin = clean(siteUrl).replace(/\/+$/, '')
    || (typeof window !== 'undefined' ? window.location.origin : '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${suffix === '/' ? '' : suffix}` || suffix;
};

export const truncate = (value: string, max = 160): string => {
  const text = clean(value).replace(/\s+/g, ' ');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
};

/** Strips markup so a rich-text description can safely become a meta tag. */
export const plainText = (value?: string): string =>
  clean(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

interface PageSeoInput {
  seo: SeoPages;
  pageKey: string;
  isKa: boolean;
  settings: Pick<StoreSettings, 'storeName' | 'ogImage'>;
  /** Used when the admin left the page title blank, e.g. a filtered listing. */
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export const resolvePageSeo = ({
  seo,
  pageKey,
  isKa,
  settings,
  fallbackTitle,
  fallbackDescription
}: PageSeoInput): ResolvedSeo => {
  const page: PageSeo | undefined = seo.pages?.[pageKey];
  const defaults = seo.defaults;

  const rawTitle =
    pickLang(page?.title, page?.titleKa, isKa)
    || clean(fallbackTitle)
    || pickLang(defaults.title, defaults.titleKa, isKa);

  const description =
    pickLang(page?.description, page?.descriptionKa, isKa)
    || clean(fallbackDescription)
    || pickLang(defaults.description, defaults.descriptionKa, isKa);

  const keywords = [
    pickLang(defaults.keywords, defaults.keywordsKa, isKa),
    pickLang(page?.keywords, page?.keywordsKa, isKa)
  ]
    .filter(Boolean)
    .join(', ');

  return {
    title: applyTitleTemplate(seo.titleTemplate, rawTitle, settings.storeName),
    description: truncate(description),
    keywords: dedupeKeywords(keywords),
    image: clean(page?.ogImage) || clean(defaults.ogImage) || clean(settings.ogImage) || undefined,
    noindex: page?.noindex ?? defaults.noindex ?? false
  };
};

interface EntitySeoInput {
  entity: EntitySeo;
  seo: SeoPages;
  isKa: boolean;
  settings: Pick<StoreSettings, 'storeName' | 'ogImage'>;
  /** What the page would say about itself with no admin input at all. */
  generatedTitle: string;
  generatedDescription: string;
  generatedKeywords?: string;
  image?: string;
}

export const resolveEntitySeo = ({
  entity,
  seo,
  isKa,
  settings,
  generatedTitle,
  generatedDescription,
  generatedKeywords,
  image
}: EntitySeoInput): ResolvedSeo => {
  const rawTitle =
    pickLang(entity.metaTitle, entity.metaTitleKa, isKa) || clean(generatedTitle);

  const description =
    pickLang(entity.metaDescription, entity.metaDescriptionKa, isKa)
    || plainText(generatedDescription)
    || pickLang(seo.defaults.description, seo.defaults.descriptionKa, isKa);

  const keywords = [
    pickLang(seo.defaults.keywords, seo.defaults.keywordsKa, isKa),
    clean(entity.metaKeywords) || clean(generatedKeywords)
  ]
    .filter(Boolean)
    .join(', ');

  return {
    title: applyTitleTemplate(seo.titleTemplate, rawTitle, settings.storeName),
    description: truncate(description),
    keywords: dedupeKeywords(keywords),
    image: clean(image) || clean(seo.defaults.ogImage) || clean(settings.ogImage) || undefined,
    noindex: false
  };
};

const dedupeKeywords = (value: string): string =>
  [...new Set(value.split(',').map(k => k.trim()).filter(Boolean))].join(', ');

/** Google truncates around these; the admin editor shows them as soft limits. */
export const SEO_LIMITS = { title: 60, description: 160 } as const;

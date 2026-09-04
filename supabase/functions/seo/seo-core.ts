// Deno counterpart of ../../../lib/seo.ts.
//
// The browser bundle and this function have to agree on what a page's title and
// description are, or a link will preview one way on Facebook and read another
// way once opened. Any change to the fallback order belongs in both files;
// scripts/smoke.mjs compares the two on a real product to catch drift.

export interface PageSeo {
  title: string;
  titleKa?: string;
  description: string;
  descriptionKa?: string;
  keywords?: string;
  keywordsKa?: string;
  ogImage?: string;
  noindex?: boolean;
}

export interface SeoPages {
  titleTemplate: string;
  robotsExtra: string;
  verification: { google?: string; bing?: string; facebookDomain?: string };
  defaults: PageSeo;
  pages: Record<string, PageSeo>;
}

export interface EntitySeo {
  metaTitle?: string;
  metaTitleKa?: string;
  metaDescription?: string;
  metaDescriptionKa?: string;
  metaKeywords?: string;
}

export interface ResolvedSeo {
  title: string;
  description: string;
  keywords: string;
  image?: string;
  noindex: boolean;
}

const clean = (value?: string | null) => (value && value.trim() ? value.trim() : '');

export const pickLang = (en?: string | null, ka?: string | null, isKa = false): string =>
  isKa ? clean(ka) || clean(en) : clean(en) || clean(ka);

export const applyTitleTemplate = (template: string, title: string, siteName: string): string => {
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

export const truncate = (value: string, max = 160): string => {
  const text = clean(value).replace(/\s+/g, ' ');
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
};

export const plainText = (value?: string): string =>
  clean(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const dedupeKeywords = (value: string): string =>
  [...new Set(value.split(',').map(k => k.trim()).filter(Boolean))].join(', ');

export const resolvePageSeo = (
  seo: SeoPages,
  pageKey: string,
  opts: { isKa: boolean; storeName: string; ogImage: string; fallbackTitle?: string; fallbackDescription?: string }
): ResolvedSeo => {
  const page = seo.pages?.[pageKey];
  const defaults = seo.defaults;
  const { isKa } = opts;

  const rawTitle =
    pickLang(page?.title, page?.titleKa, isKa)
    || clean(opts.fallbackTitle)
    || pickLang(defaults.title, defaults.titleKa, isKa);

  const description =
    pickLang(page?.description, page?.descriptionKa, isKa)
    || clean(opts.fallbackDescription)
    || pickLang(defaults.description, defaults.descriptionKa, isKa);

  const keywords = [
    pickLang(defaults.keywords, defaults.keywordsKa, isKa),
    pickLang(page?.keywords, page?.keywordsKa, isKa)
  ].filter(Boolean).join(', ');

  return {
    title: applyTitleTemplate(seo.titleTemplate, rawTitle, opts.storeName),
    description: truncate(description),
    keywords: dedupeKeywords(keywords),
    image: clean(page?.ogImage) || clean(defaults.ogImage) || clean(opts.ogImage) || undefined,
    noindex: page?.noindex ?? defaults.noindex ?? false
  };
};

export const resolveEntitySeo = (
  entity: EntitySeo,
  seo: SeoPages,
  opts: {
    isKa: boolean;
    storeName: string;
    ogImage: string;
    generatedTitle: string;
    generatedDescription: string;
    generatedKeywords?: string;
    image?: string;
  }
): ResolvedSeo => {
  const { isKa } = opts;

  const rawTitle =
    pickLang(entity.metaTitle, entity.metaTitleKa, isKa) || clean(opts.generatedTitle);

  const description =
    pickLang(entity.metaDescription, entity.metaDescriptionKa, isKa)
    || plainText(opts.generatedDescription)
    || pickLang(seo.defaults.description, seo.defaults.descriptionKa, isKa);

  const keywords = [
    pickLang(seo.defaults.keywords, seo.defaults.keywordsKa, isKa),
    clean(entity.metaKeywords) || clean(opts.generatedKeywords)
  ].filter(Boolean).join(', ');

  return {
    title: applyTitleTemplate(seo.titleTemplate, rawTitle, opts.storeName),
    description: truncate(description),
    keywords: dedupeKeywords(keywords),
    image: clean(opts.image) || clean(seo.defaults.ogImage) || clean(opts.ogImage) || undefined,
    noindex: false
  };
};

// ---------------------------------------------------------------------------
// Rich text — the legal pages' three-rule format. Mirrors lib/rich-text.tsx:
// `## ` heading, `- ` bullet, blank line ends a paragraph. Keep the two in step.
// ---------------------------------------------------------------------------

type RichBlock =
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] };

export const parseRichText = (text: string): RichBlock[] => {
  const blocks: RichBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: paragraph.join(' ') });
      paragraph = [];
    }
    if (list.length) {
      blocks.push({ type: 'ul', items: list });
      list = [];
    }
  };

  for (const raw of (text || '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      if (paragraph.length) {
        blocks.push({ type: 'p', text: paragraph.join(' ') });
        paragraph = [];
      }
      list.push(line.slice(2).trim());
    } else {
      if (list.length) {
        blocks.push({ type: 'ul', items: list });
        list = [];
      }
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
};

const escapeText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const richTextToHtml = (text: string): string =>
  parseRichText(text)
    .map(block => {
      if (block.type === 'h2') return `<h2>${escapeText(block.text)}</h2>`;
      if (block.type === 'ul') return `<ul>${block.items.map(item => `<li>${escapeText(item)}</li>`).join('')}</ul>`;
      return `<p>${escapeText(block.text)}</p>`;
    })
    .join('\n');

/** The plain first paragraph, for meta descriptions. */
export const richTextExcerpt = (text: string, max = 160): string => {
  const first = parseRichText(text).find(block => block.type === 'p');
  const value = first && first.type === 'p' ? first.text : '';
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
};

import { useTranslation } from 'react-i18next';
import { EntitySeo } from '../types';
import { useSettingsStore } from '../store/settings-store';
import { ResolvedSeo, absoluteUrl, resolveEntitySeo, resolvePageSeo } from './seo';

/**
 * React-side wrappers around lib/seo.ts. Pages call these instead of building
 * title strings inline, which is how the copy an operator types in the SEO
 * editor actually reaches the page.
 */

export const useSiteSeo = () => {
  const { i18n } = useTranslation();
  const settings = useSettingsStore(s => s.settings);
  const seoPages = useSettingsStore(s => s.seoPages);
  return { settings, seoPages, isKa: i18n.language === 'ka' };
};

export const usePageSeo = (
  pageKey: string,
  fallback?: { title?: string; description?: string }
): ResolvedSeo => {
  const { settings, seoPages, isKa } = useSiteSeo();
  return resolvePageSeo({
    seo: seoPages,
    pageKey,
    isKa,
    settings,
    fallbackTitle: fallback?.title,
    fallbackDescription: fallback?.description
  });
};

export const useEntitySeo = (
  entity: EntitySeo,
  generated: {
    title: string;
    description: string;
    keywords?: string;
    image?: string;
  }
): ResolvedSeo => {
  const { settings, seoPages, isKa } = useSiteSeo();
  return resolveEntitySeo({
    entity,
    seo: seoPages,
    isKa,
    settings,
    generatedTitle: generated.title,
    generatedDescription: generated.description,
    generatedKeywords: generated.keywords,
    image: generated.image
  });
};

/** Absolute URL for the current site, for canonicals and structured data. */
export const useSiteUrl = () => {
  const settings = useSettingsStore(s => s.settings);
  return (path: string) => absoluteUrl(settings.siteUrl, path);
};

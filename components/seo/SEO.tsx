import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/settings-store';
import { absoluteUrl, applyTitleTemplate, pickLang, truncate } from '../../lib/seo';

/**
 * Writes the document head on every route change.
 *
 * Callers pass an already-resolved title and description (see lib/use-seo.ts)
 * rather than raw strings, so what lands here is what the admin typed. The
 * component only decides how to render it into tags.
 */

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[] | string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  structuredData?: object | object[];
  noindex?: boolean;
  /** Set when the URL carries filters that produce a duplicate of another page. */
  canonicalPath?: string;
}

/** Removes anything a previous route added, so tags never leak between pages. */
const MANAGED = 'data-seo-managed';

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image,
  type = 'website',
  structuredData,
  noindex = false,
  canonicalPath
}) => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const isKa = i18n.language === 'ka';

  const settings = useSettingsStore(s => s.settings);
  const seo = useSettingsStore(s => s.seoPages);
  const siteName = settings.storeName || 'LesiKo';

  const defaultTitle = applyTitleTemplate(
    seo.titleTemplate,
    pickLang(seo.defaults.title, seo.defaults.titleKa, isKa),
    siteName
  );
  const defaultDesc = pickLang(seo.defaults.description, seo.defaults.descriptionKa, isKa);
  const defaultKeywords = pickLang(seo.defaults.keywords, seo.defaults.keywordsKa, isKa);

  const finalTitle = title?.trim() || defaultTitle;
  const finalDesc = truncate(description?.trim() || defaultDesc);

  const extra = Array.isArray(keywords) ? keywords.join(', ') : (keywords || '');
  const allKeywords = [...new Set(
    `${defaultKeywords}, ${extra}`.split(',').map(k => k.trim()).filter(Boolean)
  )].join(', ');

  // Canonicals are built from the configured origin, never from the browser's:
  // a preview deployment pointing canonicals at itself competes with the real
  // site for the same keywords.
  const canonical = absoluteUrl(settings.siteUrl, canonicalPath ?? location.pathname);
  const shareImage = image || seo.defaults.ogImage || settings.ogImage || '';
  const verification = seo.verification || {};

  const schemaJson = structuredData ? JSON.stringify(structuredData) : '';

  useEffect(() => {
    document.title = finalTitle;
    document.documentElement.lang = i18n.language;

    const upsert = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        el.setAttribute(MANAGED, '');
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const remove = (attr: 'name' | 'property', key: string) => {
      document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
    };

    upsert('name', 'description', finalDesc);
    upsert('name', 'keywords', allKeywords);
    upsert('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsert('property', 'og:type', type);
    upsert('property', 'og:title', finalTitle);
    upsert('property', 'og:description', finalDesc);
    upsert('property', 'og:url', canonical);
    upsert('property', 'og:site_name', siteName);
    upsert('property', 'og:locale', isKa ? 'ka_GE' : 'en_US');
    upsert('property', 'og:locale:alternate', isKa ? 'en_US' : 'ka_GE');

    upsert('name', 'twitter:card', shareImage ? 'summary_large_image' : 'summary');
    upsert('name', 'twitter:title', finalTitle);
    upsert('name', 'twitter:description', finalDesc);

    if (shareImage) {
      upsert('property', 'og:image', shareImage);
      upsert('property', 'og:image:alt', finalTitle);
      upsert('name', 'twitter:image', shareImage);
    } else {
      // A stale image from the previous route is worse than none at all.
      remove('property', 'og:image');
      remove('property', 'og:image:alt');
      remove('name', 'twitter:image');
    }

    if (verification.google) upsert('name', 'google-site-verification', verification.google);
    if (verification.bing) upsert('name', 'msvalidate.01', verification.bing);
    if (verification.facebookDomain) upsert('name', 'facebook-domain-verification', verification.facebookDomain);

    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute(MANAGED, '');
      document.head.appendChild(link);
    }
    link.setAttribute('href', canonical);

    const scriptId = 'seo-structured-data';
    const existing = document.getElementById(scriptId);
    if (schemaJson) {
      const script = (existing as HTMLScriptElement) || document.createElement('script');
      if (!existing) {
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = schemaJson;
    } else if (existing) {
      existing.remove();
    }
  }, [
    finalTitle,
    finalDesc,
    allKeywords,
    shareImage,
    type,
    canonical,
    siteName,
    schemaJson,
    noindex,
    i18n.language,
    isKa,
    verification.google,
    verification.bing,
    verification.facebookDomain
  ]);

  return null;
};

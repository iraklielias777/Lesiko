import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { ContentService } from '../services/content-service';
import { useSettingsStore } from '../store/settings-store';
import { usePageSeo } from '../lib/use-seo';
import { pickLang } from '../lib/seo';
import { RichText, richTextExcerpt } from '../lib/rich-text';
import { LegalContent, LegalPageKey } from '../types';

const PATH: Record<LegalPageKey, string> = {
  terms: '/terms',
  privacy: '/privacy',
  delivery: '/delivery',
  returns: '/returns'
};

/**
 * Terms, privacy, delivery and returns. One component, four routes: the copy
 * lives in the `legal_pages` content block and is edited under Content → Legal,
 * so the words can change without a deploy. `{store}` and `{email}` inside the
 * copy are filled from Settings, the same way the footer does it.
 */
export const LegalPage = ({ pageKey }: { pageKey: LegalPageKey }) => {
  const { t, i18n } = useTranslation();
  const isKa = i18n.language === 'ka';
  const settings = useSettingsStore(s => s.settings);
  const [content, setContent] = useState<LegalContent | null>(null);

  useEffect(() => {
    ContentService.getLegalContent().then(setContent).catch(() => {});
  }, []);

  const fill = (value: string) =>
    value.replace(/\{store\}/g, settings.storeName).replace(/\{email\}/g, settings.supportEmail);

  const page = content?.pages.find(p => p.key === pageKey);
  const title = page ? fill(pickLang(page.title, page.titleKa, isKa)) : '';
  const body = page ? fill(pickLang(page.body, page.bodyKa, isKa)) : '';
  const others = (content?.pages || []).filter(p => p.key !== pageKey);

  const seo = usePageSeo(pageKey, { title, description: richTextExcerpt(body) });

  const updated = page?.updatedAt
    ? new Date(page.updatedAt).toLocaleDateString(isKa ? 'ka-GE' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="bg-white min-h-screen">
      <SEO
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        image={seo.image}
        canonicalPath={PATH[pageKey]}
        noindex={seo.noindex}
      />

      <div className="bg-[#FAFAF9] border-b border-gray-100 py-14 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="text-brand-green font-bold tracking-widest uppercase text-xs mb-3 block">
            {t('legal.eyebrow')}
          </span>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            {title || ' '}
          </h1>
          {updated && (
            <p className="text-sm text-gray-400 mt-4">{t('legal.lastUpdated', { date: updated })}</p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-12 lg:gap-16">
          <article className="animate-fade-in max-w-3xl">
            {content === null && <p className="text-gray-400">{t('common.loading')}</p>}
            {content !== null && !page && <p className="text-gray-400 italic">{t('legal.missing')}</p>}
            {page && <RichText text={body} />}
          </article>

          <aside className="lg:border-l lg:border-gray-100 lg:pl-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">{t('legal.alsoSee')}</p>
            <ul className="space-y-3">
              {others.map(other => (
                <li key={other.key}>
                  <Link to={PATH[other.key]} className="text-sm font-medium text-gray-700 hover:text-brand-green transition-colors">
                    {fill(pickLang(other.title, other.titleKa, isKa))}
                  </Link>
                </li>
              ))}
            </ul>
            {settings.supportEmail && (
              <div className="mt-8 p-5 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">{t('legal.questions')}</p>
                <a href={`mailto:${settings.supportEmail}`} className="text-sm font-bold text-gray-900 hover:text-brand-green break-all">
                  {settings.supportEmail}
                </a>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

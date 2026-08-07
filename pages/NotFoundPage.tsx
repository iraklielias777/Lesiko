import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { SEO } from '../components/seo/SEO';
import { useCategories } from '../lib/use-categories';
import { categoryLabel } from '../lib/taxonomy';
import { usePageSeo } from '../lib/use-seo';

/**
 * Replaces the "under construction" placeholder every unknown URL used to hit.
 * It is noindexed and, more usefully, links onward instead of dead-ending the
 * visitor who followed a broken link.
 */
export const NotFoundPage = () => {
  const { t, i18n } = useTranslation();
  const categories = useCategories();
  const seo = usePageSeo('notFound');

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4 py-20">
      <SEO
        title={seo.title}
        description={seo.description}
        noindex
      />

      <div className="text-center max-w-lg animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Compass className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">404</p>
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          {seo.title.split(' | ')[0]}
        </h1>
        <p className="text-gray-500 leading-relaxed mb-8">{seo.description}</p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/">
            <Button leftIcon={<Home className="w-4 h-4" />}>{t('common.home')}</Button>
          </Link>
          <Link to="/products">
            <Button variant="outline" leftIcon={<Search className="w-4 h-4" />}>{t('common.shopAll')}</Button>
          </Link>
        </div>

        {categories.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
              {t('common.shop')}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map(category => (
                <Link
                  key={category.slug}
                  to={`/category/${category.slug}`}
                  className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:border-brand-green hover:text-brand-green transition-colors"
                >
                  {categoryLabel(category, i18n.language)}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

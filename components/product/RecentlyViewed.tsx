
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RECENTLY_VIEWED_REFRESH_MS, useRecentlyViewedStore } from '../../store/recently-viewed-store';
import { ProductService } from '../../services/product-service';
import { ProductCard } from './ProductCard';
import { CARD_SIZES } from '../../lib/product-image';

export const RecentlyViewed = () => {
  const { t } = useTranslation();
  const { items, refreshedAt, syncProducts } = useRecentlyViewedStore();

  useEffect(() => {
    if (!items.length || Date.now() - refreshedAt < RECENTLY_VIEWED_REFRESH_MS) return;
    ProductService.getProductsByIds(items.map(p => p.id)).then(syncProducts).catch(() => {});
    // Once per mount; the store's own stamp throttles repeat visits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-12 bg-gray-50/50 border-t border-gray-100">
      <div className="container mx-auto px-4">
        <h2 className="font-heading text-2xl font-bold text-gray-900 mb-8">{t('common.recentlyViewed')}</h2>
        
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 md:grid md:grid-cols-4 lg:grid-cols-5 md:pb-0 scroll-pl-4 scrollbar-hide">
          {items.slice(0, 5).map((product) => (
             <div key={product.id} className="min-w-[200px] md:min-w-0 snap-center">
                <ProductCard product={product} sizes={CARD_SIZES.rail5} />
             </div>
          ))}
        </div>
      </div>
    </section>
  );
};

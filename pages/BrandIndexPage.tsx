import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { SEO } from '../components/seo/SEO';
import { BrandService, hasProducts } from '../services/brand-service';
import { Brand } from '../types';
import { imageUrl } from '../lib/image-url';
import { usePageSeo, useSiteUrl } from '../lib/use-seo';

/**
 * A hub page linking out to every brand. Brands were manageable in the admin
 * but had no address of their own, so nothing on the site or in search pointed
 * at them.
 */
export const BrandIndexPage = () => {
  const { t } = useTranslation();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const seo = usePageSeo('brands');
  const url = useSiteUrl();

  useEffect(() => {
    BrandService.getBrands()
      .then(fetched => setBrands(fetched.filter(hasProducts)))
      .finally(() => setLoading(false));
  }, []);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: seo.title,
    numberOfItems: brands.length,
    itemListElement: brands.map((brand, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: url(`/brand/${brand.slug}`),
      name: brand.name
    }))
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      <SEO
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        image={seo.image}
        noindex={seo.noindex}
        structuredData={structuredData}
      />

      <div className="bg-[#FAFAF9] border-b border-gray-100">
        <div className="container mx-auto px-4 py-16 text-center animate-fade-in">
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            {seo.title.split(' | ')[0]}
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">{seo.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-gray-50 aspect-[4/3] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : brands.length === 0 ? (
          <p className="text-center text-gray-500 py-20">{t('common.noBrands')}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {brands.map((brand, index) => (
              <Link
                key={brand.id}
                to={`/brand/${brand.slug}`}
                className="group rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all animate-fade-in-up"
                style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
              >
                <div className="aspect-[4/3] bg-gray-50 overflow-hidden">
                  {brand.image ? (
                    <img
                      src={imageUrl(brand.image, { width: 480, height: 360, resize: 'cover' })}
                      srcSet={`${imageUrl(brand.image, { width: 320, height: 240, resize: 'cover' })} 320w, ${imageUrl(brand.image, { width: 640, height: 480, resize: 'cover' })} 640w`}
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      alt={brand.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Tag className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-heading font-bold text-gray-900 group-hover:text-brand-green transition-colors">
                    {brand.name}
                  </h2>
                  {brand.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{brand.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

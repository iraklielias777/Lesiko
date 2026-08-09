
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ProductService } from '../services/product-service';
import { Product } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { ProductDetailView } from '../components/product/ProductDetailView';
import { RecentlyViewed } from '../components/product/RecentlyViewed';
import { useRecentlyViewedStore } from '../store/recently-viewed-store';
import { useCartStore } from '../store/cart-store';
import { Button } from '../components/ui/Button';
import { ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { useCategories } from '../lib/use-categories';
import { categoryLabel } from '../lib/taxonomy';
import { useFormatPrice } from '../lib/format';
import { useEntitySeo, useSiteUrl } from '../lib/use-seo';
import { useSettingsStore } from '../store/settings-store';
import { NotFoundPage } from './NotFoundPage';

export const ProductDetailPage = () => {
  const fmt = useFormatPrice();
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const addRecentlyViewed = useRecentlyViewedStore((state) => state.addProduct);
  const addItem = useCartStore((state) => state.addItem);
  const categories = useCategories();
  const url = useSiteUrl();
  const currency = useSettingsStore(s => s.settings.currency);

  const categoryLabelFor = (slug: string, fallback: string) => {
    const category = categories.find(c => c.slug === slug);
    return category ? categoryLabel(category, i18n.language) : fallback;
  };

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      if (slug) {
        const data = await ProductService.getProductBySlug(slug);
        setProduct(data || null);
        if (data) {
          addRecentlyViewed(data); // Add to history
          const related = await ProductService.getRelatedProducts(data.id);
          setRelatedProducts(related);
        }
      }
      setLoading(false);
      window.scrollTo(0, 0);
    };
    loadProduct();
  }, [slug]);

  // Localization Helpers
  const isKa = i18n.language === 'ka';
  const displayName = product ? (isKa ? (product.nameKa || product.name) : product.name) : '';
  const rawDescription = product ? (isKa ? (product.descriptionKa || product.description) : product.description) : '';
  // Strip HTML tags for meta tags and schema
  const cleanDescription = rawDescription.replace(/<[^>]*>?/gm, '');

  // Hooks cannot sit behind the loading and not-found returns below, so the SEO
  // copy is resolved from whatever we have and only rendered once it is real.
  const seo = useEntitySeo(product || {}, {
    title: product ? `${displayName} | ${product.brand.name}` : '',
    description: cleanDescription,
    keywords: product
      ? [product.brand.name, product.category.name, product.subCategory, ...(product.tags || [])]
          .filter(Boolean)
          .join(', ')
      : '',
    image: product?.images.find(img => img.isPrimary)?.url || product?.images[0]?.url
  });

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-brand-green border-t-transparent rounded-full"></div></div>;
  if (!product) return <NotFoundPage />;

  const canonicalPath = `/product/${product.slug}`;

  // --- JSON-LD Schema Markup ---
  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": displayName,
    "image": product.images.map(img => img.url),
    "description": cleanDescription,
    "brand": {
      "@type": "Brand",
      "name": product.brand.name
    },
    "sku": product.id,
    "offers": {
      "@type": "Offer",
      "url": url(canonicalPath),
      // Hardcoding USD here published a different price to Google than the one
      // on the page as soon as the store switched currency.
      "priceCurrency": currency,
      "price": product.price,
      "availability": product.inventoryQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition"
    },
    "aggregateRating": product.averageRating > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": product.averageRating,
      "reviewCount": product.reviewCount || 1
    } : undefined
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": t('common.home'), "item": url('/') },
      { "@type": "ListItem", "position": 2, "name": t('common.shop'), "item": url('/products') },
      {
        "@type": "ListItem",
        "position": 3,
        "name": categoryLabelFor(product.category.slug, product.category.name),
        "item": url(`/category/${product.category.slug}`)
      },
      { "@type": "ListItem", "position": 4, "name": displayName, "item": url(canonicalPath) }
    ]
  };

  return (
    <div className="bg-white min-h-screen pb-24 md:pb-0">
      <SEO 
        title={seo.title}
        description={seo.description}
        image={seo.image}
        keywords={seo.keywords}
        type="product"
        canonicalPath={canonicalPath}
        structuredData={[productSchema, breadcrumbSchema]}
      />

      {/* Breadcrumbs */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 text-sm text-gray-500">
          <Link to="/" className="hover:text-brand-green">{t('common.home')}</Link> / 
          <Link to={`/category/${product.category.slug}`} className="hover:text-brand-green mx-1 capitalize">
            {categoryLabelFor(product.category.slug, product.category.name)}
          </Link> / 
          <span className="text-gray-900 ml-1">{displayName}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Main Product View (Reused) */}
        <div className="mb-20">
          <ProductDetailView key={product.id} product={product} />
        </div>

        {/* Related Products */}
        <div className="border-t border-gray-200 pt-16">
          <h2 className="font-heading text-2xl font-bold mb-8">{t('product.related')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
      
      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Mobile Sticky Add to Cart Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:hidden z-40 animate-slide-in-up">
         <div className="flex gap-4 items-center">
            <div className="flex-1">
                <p className="text-xs text-gray-500 line-clamp-1">{product.brand.name}</p>
                <div className="flex items-baseline gap-2">
                    <span className="font-bold text-gray-900 text-lg">{fmt(product.price)}</span>
                    {product.compareAtPrice && (
                        <span className="text-xs text-gray-400 line-through">{fmt(product.compareAtPrice)}</span>
                    )}
                </div>
            </div>
            <Button 
                onClick={() => addItem(product)} 
                disabled={product.inventoryQuantity === 0}
                className="flex-1 shadow-lg shadow-brand-green/20"
                leftIcon={<ShoppingBag className="w-4 h-4" />}
            >
                {product.inventoryQuantity === 0 ? t('common.outOfStock') : t('common.addToCart')}
            </Button>
         </div>
      </div>
    </div>
  );
};

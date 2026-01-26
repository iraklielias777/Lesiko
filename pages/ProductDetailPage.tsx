
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

export const ProductDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const addRecentlyViewed = useRecentlyViewedStore((state) => state.addProduct);
  const addItem = useCartStore((state) => state.addItem);

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

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-brand-green border-t-transparent rounded-full"></div></div>;
  if (!product) return <div className="h-screen flex items-center justify-center">Product not found</div>;

  // Localization Helpers
  const isKa = i18n.language === 'ka';
  const displayName = isKa ? (product.nameKa || product.name) : product.name;
  const rawDescription = isKa ? (product.descriptionKa || product.description) : product.description;
  // Strip HTML tags for meta tags and schema
  const cleanDescription = rawDescription.replace(/<[^>]*>?/gm, '');

  // --- Automatic SEO Generation ---
  // If product.metaTitle is missing, generate: "Name | Brand"
  const seoTitle = product.metaTitle || `${displayName} | ${product.brand.name}`;
  
  // If product.metaDescription is missing, truncate main description
  const seoDescription = product.metaDescription || 
    (cleanDescription.length > 155 ? `${cleanDescription.substring(0, 155).trim()}...` : cleanDescription);
  
  // If product.metaKeywords is missing, construct from attributes
  const seoKeywords = product.metaKeywords 
    ? product.metaKeywords.split(',').map(k => k.trim())
    : [
        displayName, 
        product.brand.name, 
        product.category.name, 
        product.subCategory, 
        ...(product.tags || [])
      ].filter((k): k is string => !!k);

  // --- JSON-LD Schema Markup ---
  const structuredData = {
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
      "url": window.location.href,
      "priceCurrency": "USD",
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

  return (
    <div className="bg-white min-h-screen pb-24 md:pb-0">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        image={product.images[0]?.url}
        keywords={seoKeywords}
        type="product"
        structuredData={structuredData}
      />

      {/* Breadcrumbs */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 text-sm text-gray-500">
          <Link to="/" className="hover:text-brand-green">{t('common.home')}</Link> / 
          <Link to={`/category/${product.category.slug}`} className="hover:text-brand-green mx-1 capitalize">
            {t(`categories.${product.category.slug}`, product.category.name)}
          </Link> / 
          <span className="text-gray-900 ml-1">{displayName}</span>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {/* Main Product View (Reused) */}
        <div className="mb-20">
          <ProductDetailView product={product} />
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
                    <span className="font-bold text-gray-900 text-lg">${product.price.toFixed(2)}</span>
                    {product.compareAtPrice && (
                        <span className="text-xs text-gray-400 line-through">${product.compareAtPrice.toFixed(2)}</span>
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

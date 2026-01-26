
import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Eye, Plus, ShoppingBag, PlayCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product } from '../../types';
import { Button } from '../ui/Button';
import { useCartStore } from '../../store/cart-store';
import { useUIStore } from '../../store/ui-store';
import { useWishlistStore } from '../../store/wishlist-store';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { t, i18n } = useTranslation();
  const addItem = useCartStore((state) => state.addItem);
  const openQuickView = useUIStore((state) => state.openQuickView);
  const { isInWishlist, toggleItem: toggleWishlist } = useWishlistStore();
  
  const isFavorited = isInWishlist(product.id);
  const discountPercentage = product.compareAtPrice 
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  // Localization logic
  const displayName = i18n.language === 'ka' ? (product.nameKa || product.name) : product.name;

  return (
    <div className="group relative flex flex-col h-full rounded-xl bg-white p-2">
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-gray-50 mb-4 isolate">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <img
            src={product.images[0]?.url || 'https://picsum.photos/400/600'}
            alt={product.images[0]?.altText || product.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-premium group-hover:scale-105"
            loading="lazy"
          />
          {/* Subtle overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
        </Link>
        
        {/* Badges - Minimalist */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {product.isNew && (
            <span className="bg-white/90 backdrop-blur-sm text-brand-dark text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm border border-gray-100">
              {t('common.new')}
            </span>
          )}
          {discountPercentage > 0 && (
            <span className="bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm">
              -{discountPercentage}%
            </span>
          )}
          {product.inventoryQuantity === 0 && (
            <span className="bg-gray-800/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm">
              {t('common.soldOut')}
            </span>
          )}
        </div>

        {/* Video Indicator */}
        {product.videoPlaybackId && (
            <div className="absolute top-3 right-12 z-20 pointer-events-none">
                <div className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                    <PlayCircle className="w-5 h-5 fill-white/20" />
                </div>
            </div>
        )}

        {/* Action Buttons - Slide in from Right with Staggered Delay */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-20 overflow-hidden pr-1 pb-1">
          <button 
            onClick={(e) => { e.preventDefault(); toggleWishlist(product); }}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all duration-500 ease-premium transform translate-x-12 group-hover:translate-x-0 ${
              isFavorited 
                ? 'bg-red-50 text-red-500 border border-red-100' 
                : 'bg-white text-gray-600 hover:text-red-500'
            }`}
            title={isFavorited ? t('product.removeFromWishlist') : t('product.addToWishlist')}
            style={{ transitionDelay: '0ms' }}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
          </button>
          
          <button 
            onClick={(e) => { e.preventDefault(); openQuickView(product); }}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-600 hover:text-brand-green transition-all duration-500 ease-premium transform translate-x-12 group-hover:translate-x-0"
            title={t('product.quickView')}
            style={{ transitionDelay: '75ms' }} 
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Add Button - Slide up from Bottom */}
        <div className="absolute bottom-4 left-4 right-4 z-20 transform translate-y-[120%] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-premium">
          <Button 
            variant="primary"
            className="w-full shadow-lg text-xs h-10 tracking-wider font-semibold border-none" 
            onClick={(e) => {
              e.preventDefault();
              addItem(product);
            }}
            disabled={product.inventoryQuantity === 0}
          >
             {product.inventoryQuantity === 0 ? t('common.outOfStock') : (
               <>
                 <ShoppingBag className="w-3.5 h-3.5 mr-2" /> {t('common.quickAdd')}
               </>
             )}
          </Button>
        </div>
      </div>

      {/* Product Details - Clean Typography */}
      <div className="flex flex-col gap-1 flex-grow px-1">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1">
             <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1 block">
               {product.brand.name}
             </span>
             <Link to={`/product/${product.slug}`}>
                <h3 className="font-medium text-brand-dark text-[15px] leading-tight group-hover:text-brand-green transition-colors line-clamp-2 min-h-[40px]">
                  {displayName}
                </h3>
             </Link>
          </div>
          <div className="text-right flex flex-col items-end">
             <span className="font-bold text-gray-900 text-sm">
                ${product.price.toFixed(2)}
             </span>
             {product.compareAtPrice && (
               <span className="text-xs text-gray-400 line-through">
                 ${product.compareAtPrice.toFixed(2)}
               </span>
             )}
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center mt-2">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className={`w-3 h-3 ${i < Math.floor(product.averageRating) ? 'text-brand-green' : 'text-gray-200'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
          ))}
          <span className="text-[10px] text-gray-400 ml-1.5 font-medium">({product.reviewCount})</span>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Star, Truck, ShieldCheck, RefreshCw, Minus, Plus, Heart, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Product, ProductVariant } from '../../types';
import { Button } from '../ui/Button';
import { useCartStore } from '../../store/cart-store';
import { useWishlistStore } from '../../store/wishlist-store';
import { useSettingsStore } from '../../store/settings-store';
import { imageSrcSet, imageUrl } from '../../lib/image-url';
import { useFormatPrice } from '../../lib/format';
import { fitClass, frameColor } from '../../lib/product-image';

/**
 * Mux Player is a web-component bundle that only matters to a product with a
 * video, and no product in the catalogue has one. Loading it on demand keeps it
 * out of the chunk every shopper downloads.
 */
const MuxPlayer = lazy(() => import('@mux/mux-player-react'));

interface ProductDetailViewProps {
  product: Product;
  onImageClick?: (id: string) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({ product }) => {
  const fmt = useFormatPrice();
  const { t, i18n } = useTranslation();
  
  // -1 represents video, 0+ represents image index
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  // Variant photo not present in product.images — show as hero without mutating the gallery.
  const [variantImageOverride, setVariantImageOverride] = useState<string | null>(null);
  
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'ingredients'>('desc');
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  
  // Variant State
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  
  const addItem = useCartStore((state) => state.addItem);
  const { toggleItem: toggleWishlist, isInWishlist } = useWishlistStore();
  const freeShippingThreshold = useSettingsStore(s => s.settings.freeShippingThreshold);
  const isFavorited = isInWishlist(product.id);

  const displayName = i18n.language === 'ka' ? (product.nameKa || product.name) : product.name;
  const displayDesc = i18n.language === 'ka' ? (product.descriptionKa || product.description) : product.description;

  const applyVariantMedia = (variant: ProductVariant | null) => {
    if (!variant?.imageUrl) {
      setVariantImageOverride(null);
      return;
    }
    const idx = product.images.findIndex((img) => img.url === variant.imageUrl);
    if (idx >= 0) {
      setActiveMediaIndex(idx);
      setVariantImageOverride(null);
    } else {
      setVariantImageOverride(variant.imageUrl);
    }
  };

  // Hard reset per product so gallery/variant state cannot leak across SKUs.
  useEffect(() => {
    setQuantity(1);
    setIsDescExpanded(false);
    setActiveMediaIndex(0);
    setVariantImageOverride(null);

    if (product.variants && product.variants.length > 0) {
      const first = product.variants[0];
      setSelectedVariant(first);
      applyVariantMedia(first);
    } else {
      setSelectedVariant(null);
    }
  }, [product.id]);

  // Determine current price and stock based on variant selection
  const currentPrice = selectedVariant?.price || product.price;
  const currentStock = selectedVariant ? selectedVariant.inventoryQuantity : product.inventoryQuantity;
  const isOutOfStock = currentStock === 0;

  const handleAddToCart = () => {
      addItem(product, quantity, selectedVariant || undefined);
  };

  const selectVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    applyVariantMedia(variant);
  };

  const selectGalleryImage = (idx: number) => {
    setVariantImageOverride(null);
    setActiveMediaIndex(idx);
  };

  const isVideoActive = !variantImageOverride && activeMediaIndex === -1 && !!product.videoPlaybackId;
  const activeImage =
    !isVideoActive && !variantImageOverride && product.images.length > 0
      ? product.images[Math.min(Math.max(activeMediaIndex, 0), product.images.length - 1)]
      : undefined;
  // The variant override is a bare URL; recover its row so the stage can use
  // the backdrop and fit recorded for it.
  const heroImage = variantImageOverride
    ? product.images.find((img) => img.url === variantImageOverride)
    : activeImage;
  const heroUrl = variantImageOverride || activeImage?.url;
  const heroAlt = variantImageOverride
    ? `${displayName}${selectedVariant?.name ? ` — ${selectedVariant.name}` : ''}`
    : (activeImage?.altText || product.name);
  const hasActiveImage = !!heroUrl;

  return (
    // Capped so the gallery cannot grow with the viewport. Left uncapped, a
    // square image on a 1500px screen renders ~700px tall and pushes the buy
    // button below the fold.
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto w-full">
      {/* Left Column: Media Gallery */}
      <div className="space-y-4 w-full max-w-[560px] mx-auto md:mx-0">
        {/* Square stage, width-capped by column and by 70dvh so short viewports
            keep Add to cart reachable; any upload ratio letterboxes inside. */}
        <div
          className="w-full max-w-[min(100%,70dvh)] aspect-square mx-auto rounded-2xl overflow-hidden relative shadow-sm border border-gray-100"
          style={{ backgroundColor: frameColor(heroImage) }}
        >
          {isVideoActive ? (
             <Suspense fallback={<div className="absolute inset-0 bg-gray-900 animate-pulse" />}>
               <MuxPlayer
                  streamType="on-demand"
                  playbackId={product.videoPlaybackId!}
                  metadataVideoTitle={displayName}
                  primaryColor="#AED136"
                  secondaryColor="#000000"
                  style={{ height: '100%', width: '100%' }}
                  autoPlay="muted"
               />
             </Suspense>
          ) : hasActiveImage ? (
             /* Contained rather than cropped: a shopper deciding on a purchase
                needs to see the whole bottle and its label, whatever the ratio. */
             <img
                key={heroUrl}
                src={imageUrl(heroUrl!, { width: 560 })}
                srcSet={imageSrcSet(heroUrl!, [400, 560, 840, 1120])}
                sizes="(min-width: 768px) min(560px, 70dvh), min(100vw, 70dvh)"
                alt={heroAlt}
                width={1200}
                height={1200}
                className={`absolute inset-0 w-full h-full ${fitClass(heroImage)} ${heroImage?.bgColor ? '' : 'p-4'}`}
                decoding="async"
                fetchPriority="high"
             />
          ) : (
             <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
               {t('common.noImage')}
             </div>
          )}
        </div>

        {/* Thumbnails — fixed size, so a product with two images does not get
            thumbnails twice the size of one with five. */}
        <div className="flex flex-wrap gap-3">
          {product.images.map((img, idx) => (
            <button 
              key={img.id}
              onClick={() => selectGalleryImage(idx)}
              className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                !isVideoActive && !variantImageOverride && activeMediaIndex === idx
                  ? 'border-brand-green ring-1 ring-brand-green'
                  : variantImageOverride && img.url === variantImageOverride
                  ? 'border-brand-green ring-1 ring-brand-green'
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              <img
                src={imageUrl(img.url, { width: 160 })}
                alt={img.altText || `${product.name} thumbnail`}
                className={`w-full h-full ${fitClass(img)} ${img.bgColor ? '' : 'bg-gray-50 p-1'}`}
                style={img.bgColor ? { backgroundColor: img.bgColor } : undefined}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
          
          {/* Video Thumbnail */}
          {product.videoPlaybackId && (
             <button
                onClick={() => { setVariantImageOverride(null); setActiveMediaIndex(-1); }}
                className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all bg-black flex items-center justify-center relative group ${isVideoActive ? 'border-brand-green ring-1 ring-brand-green' : 'border-transparent hover:border-gray-600'}`}
             >
                <img 
                    src={`https://image.mux.com/${product.videoPlaybackId}/thumbnail.jpg?time=0`} 
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    alt="Video Thumbnail"
                />
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center z-10">
                    <Play className="w-4 h-4 text-white fill-white" />
                </div>
             </button>
          )}
        </div>
      </div>

      {/* Right Column: Details */}
      <div className="flex flex-col h-full">
        <div className="mb-2">
          <span className="text-sm font-medium text-brand-green uppercase tracking-wider">{product.brand.name}</span>
        </div>
        <h1 className="font-heading text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">{displayName}</h1>
        
        {product.reviewCount > 0 && (
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.averageRating) ? 'fill-current' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="text-sm text-gray-500">{product.reviewCount} {t('product.reviews')}</span>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl font-bold text-gray-900">{fmt(currentPrice)}</span>
          {product.compareAtPrice && !selectedVariant && (
            <span className="text-xl text-gray-400 line-through">{fmt(product.compareAtPrice)}</span>
          )}
        </div>

        {/* Short Description with "Read More" logic for layout optimization */}
        <div className="relative mb-8">
            <p className={`text-gray-600 leading-relaxed transition-all duration-500 ease-in-out overflow-hidden ${isDescExpanded ? 'max-h-[1000px]' : 'max-h-[85px] line-clamp-3'}`}>
                {displayDesc}
            </p>
            {/* Fade effect only if not expanded and text is long enough (simple check) */}
            {!isDescExpanded && displayDesc.length > 150 && (
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent"></div>
            )}
            {displayDesc.length > 150 && (
                <button 
                    onClick={() => setIsDescExpanded(!isDescExpanded)} 
                    className="text-brand-green font-bold text-sm mt-2 hover:underline focus:outline-none"
                >
                    {isDescExpanded ? 'Read Less' : 'Read More'}
                </button>
            )}
        </div>

        {/* Variant Selector */}
        {product.variants && product.variants.length > 0 && (
            <div className="mb-8">
                <span className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                    {t('common.selectOption')}: <span className="text-brand-green">{selectedVariant?.name}</span>
                </span>
                <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => (
                        <button
                            key={variant.id}
                            onClick={() => selectVariant(variant)}
                            className={`min-w-[80px] px-4 py-2 border rounded-lg text-sm font-medium transition-all relative ${
                                selectedVariant?.id === variant.id
                                ? 'border-brand-green bg-brand-green/10 text-brand-dark ring-1 ring-brand-green'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                            } ${variant.inventoryQuantity === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={variant.inventoryQuantity === 0}
                        >
                            {variant.name}
                            {variant.inventoryQuantity === 0 && (
                                <span className="absolute -top-2 -right-2 bg-gray-100 text-gray-500 text-[10px] px-1 rounded border border-gray-200">Out</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
           <div className="flex items-center border border-gray-300 rounded-full w-max px-2 h-14 bg-gray-50">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-3 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center font-bold">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="p-3 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
           </div>
           <Button 
              size="lg" 
              className="flex-1 h-14 shadow-xl shadow-brand-green/20 text-base"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
           >
             {isOutOfStock ? t('common.outOfStock') : t('common.addToCart')}
           </Button>
           <button 
             onClick={() => toggleWishlist(product)}
             className={`h-14 w-14 border rounded-full flex items-center justify-center transition-all ${isFavorited ? 'border-red-500 text-red-500 bg-red-50' : 'border-gray-300 hover:border-brand-green hover:text-brand-green bg-white'}`}
             title={isFavorited ? t('product.removeFromWishlist') : t('product.addToWishlist')}
           >
             <Heart className={`w-6 h-6 ${isFavorited ? 'fill-current' : ''}`} />
           </button>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
           <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
             <Truck className="w-5 h-5 text-brand-green" />
             <span>{t('product.freeShippingBadge', { amount: freeShippingThreshold })}</span>
           </div>
           <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
             <ShieldCheck className="w-5 h-5 text-brand-green" />
             <span>{t('product.crueltyFree')}</span>
           </div>
           <div className="flex items-center gap-3 text-sm text-gray-700 font-medium">
             <RefreshCw className="w-5 h-5 text-brand-green" />
             <span>{t('product.returns')}</span>
           </div>
        </div>

        {/* Optimized Tabs for Large Text */}
        <div className="mt-auto pt-6 border-t border-gray-200">
           <div className="flex gap-8 border-b border-gray-200 mb-6">
             {['desc', 'ingredients'].map((tab) => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab as any)}
                 className={`pb-3 text-sm font-bold tracking-wide transition-all uppercase relative ${
                   activeTab === tab 
                   ? 'text-brand-dark' 
                   : 'text-gray-400 hover:text-gray-600'
                 }`}
               >
                 {t(`product.${tab}`)}
                 {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-green"></span>
                 )}
               </button>
             ))}
           </div>
           
           {/* Scrollable container for really long technical text to prevent page jump */}
           <div className="text-gray-600 text-sm leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
              {activeTab === 'desc' && (
                <div className="space-y-4">
                    <p>{displayDesc}</p>
                    <p>Designed for daily use. Apply to clean skin morning and night.</p>
                </div>
              )}
              {activeTab === 'ingredients' && (
                <div className="space-y-2">
                    <p className="font-mono text-xs text-gray-500">
                        Aqua (Water), Glycerin, Butylene Glycol, Caprylic/Capric Triglyceride, Squalane, Tocopherol (Vitamin E), Aloe Barbadensis Leaf Juice, Phenoxyethanol, Ethylhexylglycerin, Carbomer, Sodium Hyaluronate, Panthenol, Citric Acid.
                    </p>
                    <p className="text-xs text-gray-400 italic mt-2">
                        * Ingredients are subject to change at the manufacturer's discretion. For the most complete and up-to-date list of ingredients, refer to the product packaging.
                    </p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

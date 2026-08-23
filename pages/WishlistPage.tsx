
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Clock, MoveRight, Trash2, ShoppingCart, ArrowRight, Sparkles, Bookmark } from 'lucide-react';
import { useWishlistStore } from '../store/wishlist-store';
import { useCartStore } from '../store/cart-store';
import { Button } from '../components/ui/Button';
import { Product } from '../types';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { useCategories } from '../lib/use-categories';
import { categoryLabel } from '../lib/taxonomy';
import { useFormatPrice } from '../lib/format';
import { ProductThumb } from '../components/product/ProductThumb';
import { usePageSeo } from '../lib/use-seo';

export const WishlistPage = () => {
  const fmt = useFormatPrice();
  const { t, i18n } = useTranslation();
  const categories = useCategories();
  const seo = usePageSeo('wishlist', { title: t('wishlist.title') });
  const { items, savedItems, removeItem, moveToSaved, moveToWishlist, removeFromSaved } = useWishlistStore();
  const addItemToCart = useCartStore(state => state.addItem);
  const [activeTab, setActiveTab] = useState<'wishlist' | 'saved'>('wishlist');

  const renderProductRow = (product: Product, type: 'wishlist' | 'saved') => (
    <div key={product.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-white animate-fade-in group">
        <ProductThumb
            product={product}
            alt={product.name}
            size={112}
            className="w-full sm:w-28 h-28 rounded-md flex-shrink-0"
            imgClassName={`transition-transform duration-700 group-hover:scale-105 ${product.inventoryQuantity === 0 ? 'opacity-60 grayscale' : ''}`}
        >
            <Link to={`/product/${product.slug}`} className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </ProductThumb>
        <div className="flex-1 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <div>
                        <Link to={`/product/${product.slug}`} className="font-heading font-semibold text-gray-900 hover:text-brand-green text-lg line-clamp-1 transition-colors">
                            {product.name}
                        </Link>
                        <p className="text-sm text-gray-500 mb-1">{product.brand.name}</p>
                    </div>
                    <span className="font-bold text-gray-900 text-lg">{fmt(product.price)}</span>
                </div>
                {product.inventoryQuantity === 0 ? (
                   <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-500 mt-1">
                     {t('common.outOfStock')}
                   </span>
                ) : (
                   <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 mt-1">
                     In Stock
                   </span>
                )}
            </div>
            
            <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0 pt-3 border-t border-gray-50 sm:border-t-0 sm:pt-0">
                <Button 
                    size="sm" 
                    disabled={product.inventoryQuantity === 0}
                    onClick={() => addItemToCart(product)}
                    leftIcon={product.inventoryQuantity > 0 ? <ShoppingCart className="w-3 h-3" /> : undefined}
                    className={`flex-1 sm:flex-none ${product.inventoryQuantity === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100' : ''}`}
                >
                    {product.inventoryQuantity === 0 ? t('common.outOfStock') : t('common.addToCart')}
                </Button>
                
                {type === 'wishlist' ? (
                    <button 
                        onClick={() => moveToSaved(product)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors px-3 py-2 rounded-full hover:bg-gray-100"
                    >
                        <Clock className="w-3.5 h-3.5" /> {t('wishlist.savedForLater')}
                    </button>
                ) : (
                    <button 
                        onClick={() => moveToWishlist(product)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors px-3 py-2 rounded-full hover:bg-gray-100"
                    >
                        <MoveRight className="w-3.5 h-3.5" /> {t('wishlist.moveToWishlist')}
                    </button>
                )}
                
                <button 
                    onClick={() => type === 'wishlist' ? removeItem(product.id) : removeFromSaved(product.id)}
                    className="text-gray-400 hover:text-red-500 ml-auto sm:ml-auto p-2 rounded-full hover:bg-red-50 transition-colors"
                    title={t('common.remove')}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-20">
      <SEO title={seo.title} description={seo.description} noindex={seo.noindex} canonicalPath="/wishlist" />
      
      <div className="bg-white border-b border-gray-200 mb-8 sticky top-[72px] z-30 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 shadow-sm">
                <Heart className="w-6 h-6 text-red-500 fill-current" />
             </div>
             <div>
               <h1 className="font-heading text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                 {t('wishlist.title')}
               </h1>
               <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mt-1">{t('wishlist.curate')}</p>
             </div>
          </div>
          
          <div className="flex gap-8">
              <button 
                onClick={() => setActiveTab('wishlist')}
                className={`pb-3 text-sm font-bold tracking-wide transition-all relative ${activeTab === 'wishlist' ? 'text-brand-dark' : 'text-gray-400 hover:text-gray-600'}`}
              >
                  {t('wishlist.title').toUpperCase()} ({items.length})
                  {activeTab === 'wishlist' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-green" />}
              </button>
              <button 
                onClick={() => setActiveTab('saved')}
                className={`pb-3 text-sm font-bold tracking-wide transition-all relative ${activeTab === 'saved' ? 'text-brand-dark' : 'text-gray-400 hover:text-gray-600'}`}
              >
                  {t('wishlist.savedForLater').toUpperCase()} ({savedItems.length})
                  {activeTab === 'saved' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-green" />}
              </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl">
        {activeTab === 'wishlist' && (
            <div className="space-y-4">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-24 px-4 bg-white rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="relative mb-8 group">
                            <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-500"></div>
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center relative z-10 shadow-sm border border-red-50">
                                <Heart className="w-10 h-10 text-red-400 stroke-[1.5] group-hover:scale-110 transition-transform duration-500" />
                            </div>
                        </div>
                        <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">{t('wishlist.emptyTitle')}</h2>
                        <p className="text-gray-500 mb-10 max-w-lg mx-auto leading-relaxed text-lg font-light">
                            {t('wishlist.emptyDesc')}
                        </p>
                        <div className="w-full max-w-sm">
                            <Link to="/products">
                                <Button size="lg" className="w-full shadow-xl shadow-brand-green/20 h-14 text-base">{t('wishlist.startExploring')}</Button>
                            </Link>
                        </div>
                        {/* Categories Quick Links */}
                        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm font-medium text-gray-600">
                            <span>{t('wishlist.popular')}</span>
                            {categories.slice(0, 2).map(cat => (
                                <Link key={cat.slug} to={`/category/${cat.slug}`} className="hover:text-brand-green underline decoration-transparent hover:decoration-brand-green underline-offset-4 transition-all">
                                    {categoryLabel(cat, i18n.language)}
                                </Link>
                            ))}
                            <Link to="/sale" className="text-red-500 hover:text-red-600 underline decoration-transparent hover:decoration-red-200 underline-offset-4 transition-all">{t('common.sale')}</Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {items.map(p => renderProductRow(p, 'wishlist'))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'saved' && (
            <div className="space-y-4">
                {savedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-24 px-4 bg-gray-50 rounded-3xl border border-gray-200 border-dashed">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <Bookmark className="w-8 h-8 text-gray-400 stroke-[1.5]" />
                        </div>
                        <h2 className="text-2xl font-heading font-bold text-gray-900 mb-3">{t('wishlist.emptySavedTitle')}</h2>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed font-light">
                            {t('wishlist.emptySavedDesc')}
                        </p>
                        <Link to="/products">
                            <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4"/>}>
                                {t('checkout.continueShopping')}
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {savedItems.map(p => renderProductRow(p, 'saved'))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

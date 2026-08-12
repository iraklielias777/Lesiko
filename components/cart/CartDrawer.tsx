
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag, ArrowRight, Tag, Truck, Check } from 'lucide-react';
import { useCartStore } from '../../store/cart-store';
import { useSettingsStore } from '../../store/settings-store';
import { Button } from '../ui/Button';
import { useTranslation } from 'react-i18next';
import { useFormatPrice } from '../../lib/format';

export const CartDrawer = () => {
  const fmt = useFormatPrice();
  const { t } = useTranslation();
  const { items, isOpen, toggleCart, updateQuantity, removeItem, getSubtotal } = useCartStore();
  const freeShippingThreshold = useSettingsStore(s => s.settings.freeShippingThreshold);
  const navigate = useNavigate();

  const subtotal = getSubtotal();
  const awayFromFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPercent = freeShippingThreshold > 0
    ? Math.min(100, (subtotal / freeShippingThreshold) * 100)
    : 100;

  if (!isOpen) return null;

  const handleStartShopping = () => {
      toggleCart();
      navigate('/products');
  };

  return (
    // Z-Index 150 ensures it's above the Modal (100)
    <div className="fixed inset-0 z-[150]">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={toggleCart}
      />
      <div 
        className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform"
        style={{ animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards' }}
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white z-10">
          <h2 className="font-heading font-bold text-xl flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-gray-700" /> {t('cart.title')}
            <span className="text-sm font-normal text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-100">
               {items.length} {t('common.items')}
            </span>
          </h2>
          <button onClick={toggleCart} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        {items.length > 0 && (
            <div className="px-6 pt-6 pb-2">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center gap-2 text-sm font-bold text-brand-dark mb-2">
                        {awayFromFreeShipping > 0 ? (
                            <>
                                <div className="w-6 h-6 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green">
                                    <Truck className="w-3.5 h-3.5" />
                                </div>
                                <span>You're <span className="text-brand-green">{fmt(awayFromFreeShipping)}</span> away from free shipping!</span>
                            </>
                        ) : (
                            <>
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <Check className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-green-600">You've unlocked Free Shipping!</span>
                            </>
                        )}
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-brand-green transition-all duration-500 ease-out relative"
                            style={{ width: `${progressPercent}%` }}
                        >
                            <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-white">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="relative mb-8 group">
                 <div className="absolute inset-0 bg-brand-green/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                 <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center relative z-10 border border-gray-100">
                    <ShoppingBag className="w-10 h-10 text-gray-300 group-hover:text-brand-green transition-colors duration-500 stroke-[1.5]" />
                 </div>
              </div>
              <h3 className="text-3xl font-heading font-bold text-gray-900 mb-4 tracking-tight">{t('cart.emptyTitle')}</h3>
              <p className="text-gray-500 mb-12 max-w-[280px] mx-auto leading-relaxed text-base font-light">
                {t('cart.emptyDesc')}
              </p>
              <div className="w-full space-y-4">
                  <Button 
                    onClick={handleStartShopping} 
                    className="w-full shadow-xl shadow-brand-green/20 h-14 text-base" 
                    size="lg"
                  >
                    {t('cart.shopBestSellers')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { toggleCart(); navigate('/sale'); }} 
                    className="w-full border-gray-200 bg-white hover:bg-gray-50 h-14 text-base"
                    leftIcon={<Tag className="w-4 h-4" />}
                  >
                    {t('cart.viewSale')}
                  </Button>
              </div>
            </div>
          ) : (
            items.map((item) => {
              // Determine display price: variant price > base price
              const displayPrice = item.selectedVariant?.price || item.product.price;
              
              return (
                <div key={item.id} className="flex gap-4 animate-fade-in group bg-white p-3 rounded-xl border border-gray-100 hover:border-brand-green/30 transition-colors shadow-sm">
                  <div className="w-24 h-28 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img 
                      src={item.product.images[0]?.url} 
                      alt={item.product.name}
                      className="w-full h-full object-contain p-0.5 transition-transform duration-500 group-hover:scale-105"
                    />
                    <Link 
                      to={`/product/${item.product.slug}`} 
                      onClick={toggleCart}
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h3 className="font-heading font-semibold text-gray-900 line-clamp-2 leading-tight mb-1">
                          <Link to={`/product/${item.product.slug}`} onClick={toggleCart} className="hover:text-brand-green transition-colors">
                              {item.product.name}
                          </Link>
                      </h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                          {item.product.brand.name}
                          {item.selectedVariant && (
                              <span className="ml-1 text-gray-700 font-bold">• {item.selectedVariant.name}</span>
                          )}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-end mt-2">
                      <div className="flex items-center border border-gray-200 rounded-md shadow-sm bg-gray-50">
                        <button 
                          className="p-1.5 hover:bg-white text-gray-500 transition-colors rounded-l-md"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-sm font-medium w-8 text-center bg-white h-full flex items-center justify-center border-x border-gray-200">{item.quantity}</span>
                        <button 
                          className="p-1.5 hover:bg-white text-gray-500 transition-colors rounded-r-md"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <div className="text-right">
                         <p className="font-bold text-gray-900 mb-1">{fmt(displayPrice * item.quantity)}</p>
                         <button 
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-red-400 hover:text-red-600 underline decoration-red-200/50 underline-offset-2 hover:decoration-red-600 transition-all"
                        >
                          {t('common.remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {items.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50/80 backdrop-blur-md shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-20">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600 font-medium">{t('cart.subtotal')}</span>
              <span className="font-heading font-bold text-xl">{fmt(subtotal)}</span>
            </div>
            <p className="text-xs text-gray-500 mb-6 text-center">Shipping and taxes calculated at checkout.</p>
            <Link to="/checkout" onClick={toggleCart}>
               <Button className="w-full shadow-xl shadow-brand-green/20" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                 {t('cart.proceedToCheckout')}
               </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

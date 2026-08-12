import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ArrowRight, Trash2, Truck, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../store/cart-store';
import { useSettingsStore, calculateTotals } from '../store/settings-store';
import { Button } from '../components/ui/Button';
import { SEO } from '../components/seo/SEO';
import { useFormatPrice } from '../lib/format';

export const CartPage = () => {
  const fmt = useFormatPrice();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, getSubtotal } = useCartStore();
  const settings = useSettingsStore(s => s.settings);

  const subtotal = getSubtotal();
  const { shipping, tax, total } = calculateTotals(subtotal, settings);
  const awayFromFreeShipping = Math.max(0, settings.freeShippingThreshold - subtotal);

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] bg-[#FAFAF9] flex items-center justify-center px-4">
        <SEO title={t('cart.title')} noindex />
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 border border-gray-100">
            <ShoppingBag className="w-10 h-10 text-gray-300 stroke-[1.5]" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-gray-900 mb-4">{t('cart.emptyTitle')}</h1>
          <p className="text-gray-500 mb-10 font-light leading-relaxed">{t('cart.emptyDesc')}</p>
          <Button size="lg" onClick={() => navigate('/products')} rightIcon={<ArrowRight className="w-4 h-4" />}>
            {t('cart.shopBestSellers')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-20">
      <SEO title={t('cart.title')} noindex />

      <div className="container mx-auto px-4 py-12">
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-8">
          {t('cart.title')}
          <span className="text-gray-400 font-sans font-normal text-lg ml-3">
            {items.length} {t('common.items')}
          </span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map(item => {
              const displayPrice = item.selectedVariant?.price || item.product.price;

              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4">
                  <Link to={`/product/${item.product.slug}`} className="w-28 h-32 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={item.product.images[0]?.url} alt={item.product.name} className="w-full h-full object-contain p-0.5" />
                  </Link>

                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <h2 className="font-heading font-semibold text-gray-900 leading-tight mb-1">
                        <Link to={`/product/${item.product.slug}`} className="hover:text-brand-green transition-colors">
                          {item.product.name}
                        </Link>
                      </h2>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        {item.product.brand.name}
                        {item.selectedVariant && (
                          <span className="ml-1 text-gray-700 font-bold">• {item.selectedVariant.name}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex justify-between items-end mt-3">
                      <div className="flex items-center border border-gray-200 rounded-md bg-gray-50">
                        <button
                          className="p-1.5 hover:bg-white text-gray-500 transition-colors rounded-l-md"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-sm font-medium w-10 text-center bg-white border-x border-gray-200 py-1">{item.quantity}</span>
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
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> {t('common.remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h3 className="font-heading font-bold text-lg mb-6">{t('checkout.orderSummary')}</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{t('common.subtotal')}</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t('common.shipping')}</span>
                  <span>{shipping === 0 ? 'Free' : fmt(shipping)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>{t('common.tax')}</span>
                  <span>{fmt(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-100 pt-3">
                  <span>{t('common.total')}</span>
                  <span>{fmt(total)}</span>
                </div>
              </div>

              <div className="mt-6 mb-6 flex items-center gap-2 text-xs bg-gray-50 border border-gray-100 rounded-xl p-3">
                {awayFromFreeShipping > 0 ? (
                  <>
                    <Truck className="w-4 h-4 text-brand-green flex-shrink-0" />
                    <span>You're <span className="font-bold text-brand-green">{fmt(awayFromFreeShipping)}</span> away from free shipping.</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-green-700 font-medium">Free shipping unlocked.</span>
                  </>
                )}
              </div>

              <Button
                className="w-full shadow-xl shadow-brand-green/20"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => navigate('/checkout')}
              >
                {t('cart.proceedToCheckout')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../store/cart-store';
import { useSettingsStore, calculateTotals } from '../store/settings-store';
import { Button } from '../components/ui/Button';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { PaymentService } from '../services/payment-service';
import { OrderService } from '../services/order-service';
import { Address, Order } from '../types';
import { SEO } from '../components/seo/SEO';
import { useFormatPrice } from '../lib/format';

type CheckoutStep = 'shipping' | 'payment';

export const CheckoutPage = () => {
  const fmt = useFormatPrice();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, getSubtotal, clearCart } = useCartStore();
  const settings = useSettingsStore(s => s.settings);
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [address, setAddress] = useState<Address>({
    email: '', firstName: '', lastName: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'US'
  });
  
  const subtotal = getSubtotal();
  const { shipping, tax, total } = calculateTotals(subtotal, settings);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
    window.scrollTo(0, 0);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Create Payment Intent (Mock)
      const intent = await PaymentService.createPaymentIntent(items, address, { subtotal, shipping, tax, total });
      
      // 2. Confirm Payment (Mock)
      const result = await PaymentService.confirmPayment(intent.orderId, {});
      
      if (result.success) {
        // 3. PERSIST ORDER TO DB (OrderService)
        const newOrder: Order = {
            id: intent.orderId,
            orderNumber: intent.orderId.replace('ORD-', ''),
            customerName: `${address.firstName} ${address.lastName}`,
            shippingAddress: address,
            items: items,
            paymentStatus: 'paid',
            status: 'Processing',
            subtotal,
            shipping,
            tax,
            total,
            createdAt: new Date().toISOString().split('T')[0]
        };

        await OrderService.createOrder(newOrder);

        // 4. Cleanup and Redirect
        clearCart();
        navigate('/order-confirmation', { 
          state: { 
            orderId: intent.orderId,
            order: newOrder
          } 
        });
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <SEO title={t('common.checkout')} noindex />

      {/* Checkout Header */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="font-heading font-bold text-2xl tracking-tight text-brand-dark">
            Lesi<span className="text-brand-green">Ko</span> <span className="text-gray-400 text-lg font-sans font-normal ml-2">{t('common.checkout')}</span>
          </div>
          <div className="flex items-center text-sm font-medium text-gray-500">
            <Lock className="w-4 h-4 mr-1" /> {t('checkout.secure')}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Form Area */}
          <div className="lg:w-2/3">
            {/* Steps Indicator */}
            <div className="flex items-center mb-8">
              <div className={`flex items-center ${step === 'shipping' ? 'text-brand-green' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'shipping' ? 'border-brand-green font-bold' : 'border-gray-300'}`}>1</div>
                <span className="ml-2 font-medium">{t('checkout.shipping')}</span>
              </div>
              <div className="w-12 h-px bg-gray-300 mx-4"></div>
              <div className={`flex items-center ${step === 'payment' ? 'text-brand-green' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'payment' ? 'border-brand-green font-bold' : 'border-gray-300'}`}>2</div>
                <span className="ml-2 font-medium">{t('checkout.payment')}</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            {/* Step 1: Shipping */}
            {step === 'shipping' && (
              <form onSubmit={handleShippingSubmit} className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
                <h2 className="text-xl font-heading font-bold mb-6">{t('checkout.contact')}</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.email')}</label>
                    <input 
                      type="email" required
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                      value={address.email}
                      onChange={(e) => setAddress({...address, email: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.firstName')}</label>
                      <input 
                        type="text" required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={address.firstName}
                        onChange={(e) => setAddress({...address, firstName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.lastName')}</label>
                      <input 
                        type="text" required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={address.lastName}
                        onChange={(e) => setAddress({...address, lastName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address')}</label>
                    <input 
                      type="text" required
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                      value={address.address1}
                      onChange={(e) => setAddress({...address, address1: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.apt')}</label>
                    <input 
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                      value={address.address2}
                      onChange={(e) => setAddress({...address, address2: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.zip')}</label>
                      <input 
                        type="text" required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={address.zip}
                        onChange={(e) => setAddress({...address, zip: e.target.value})}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.city')}</label>
                      <input 
                        type="text" required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={address.city}
                        onChange={(e) => setAddress({...address, city: e.target.value})}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.state')}</label>
                      <input 
                        type="text" required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={address.state}
                        onChange={(e) => setAddress({...address, state: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <Button type="submit" size="lg">{t('checkout.continueToPayment')}</Button>
                </div>
              </form>
            )}

            {/* Step 2: Payment (Stripe Mock) */}
            {step === 'payment' && (
              <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
                <h2 className="text-xl font-heading font-bold mb-6">{t('checkout.paymentMethod')}</h2>
                
                {/* Simulated Stripe Element Container */}
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                   <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                      <CreditCard className="w-5 h-5 text-gray-500" />
                      <span className="font-medium text-gray-700">Credit or Debit Card</span>
                      <div className="ml-auto flex gap-1">
                         <div className="w-8 h-5 bg-gray-200 rounded"></div>
                         <div className="w-8 h-5 bg-gray-200 rounded"></div>
                      </div>
                   </div>
                   
                   {/* Fake Elements */}
                   <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase">Card Number</label>
                        <div className="mt-1 p-3 border border-gray-300 rounded bg-gray-50 text-gray-400 font-mono text-sm">
                           4242 4242 4242 4242
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">Expiration</label>
                            <div className="mt-1 p-3 border border-gray-300 rounded bg-gray-50 text-gray-400 font-mono text-sm">
                               12 / 24
                            </div>
                         </div>
                         <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase">CVC</label>
                            <div className="mt-1 p-3 border border-gray-300 rounded bg-gray-50 text-gray-400 font-mono text-sm">
                               ***
                            </div>
                         </div>
                      </div>
                   </div>
                   <p className="text-xs text-gray-500 mt-4 flex items-center">
                     <Lock className="w-3 h-3 mr-1" /> Payments are secure and encrypted.
                   </p>
                </div>

                <div className="flex justify-between items-center">
                   <button 
                     type="button" 
                     onClick={() => setStep('shipping')}
                     className="text-gray-500 hover:text-gray-900 font-medium"
                   >
                     {t('checkout.backToShipping')}
                   </button>
                   <Button 
                     onClick={handlePaymentSubmit} 
                     size="lg" 
                     isLoading={isLoading}
                   >
                     {t('checkout.pay')} {fmt(total)}
                   </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Summary */}
          <div className="lg:w-1/3">
            <OrderSummary 
              items={items}
              subtotal={subtotal}
              shipping={shipping}
              tax={tax}
              total={total}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

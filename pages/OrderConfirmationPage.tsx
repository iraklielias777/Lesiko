
import React, { useEffect } from 'react';
import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Order } from '../types';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { useFormatPrice } from '../lib/format';

export const OrderConfirmationPage = () => {
  const fmt = useFormatPrice();
  const { t } = useTranslation();
  const location = useLocation();
  const state = location.state as { orderId: string, order: Order } | undefined;

  useEffect(() => {
    // Simulate trigger email service here
    if (state?.order) {
       console.log(`[Email Service] Sending confirmation email to ${state.order.shippingAddress.email} for order ${state.orderId}`);
    }
  }, [state]);

  if (!state) {
    return <Navigate to="/" />;
  }

  const { order } = state;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <SEO title={t('checkout.thankYou')} noindex />

      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center mb-8 animate-scale-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="font-heading font-bold text-3xl text-gray-900 mb-2">{t('checkout.thankYou')}</h1>
          <p className="text-gray-600 mb-6">
            {t('checkout.orderPlaced')} <span className="font-mono font-bold text-gray-900">#{order.orderNumber}</span>
          </p>
          <p className="text-sm text-gray-500 mb-8">
            {t('checkout.emailSent')} <span className="font-medium text-gray-900">{order.shippingAddress.email}</span>.
          </p>
          
          <div className="flex justify-center gap-4">
             <Link to="/products">
                <Button variant="outline">{t('checkout.continueShopping')}</Button>
             </Link>
             <Link to="/account/orders">
                <Button rightIcon={<ArrowRight className="w-4 h-4" />}>{t('checkout.trackOrder')}</Button>
             </Link>
          </div>
        </div>

        {/* Order Details Preview */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="font-heading font-bold text-lg mb-4 flex items-center">
             <Package className="w-5 h-5 mr-2 text-brand-green" /> 
             {t('checkout.shipmentDetails')}
          </h2>
          <div className="border-t border-gray-100 pt-4">
             <p className="font-medium text-gray-900 mb-1">{t('checkout.shippingTo')}:</p>
             <p className="text-gray-600 text-sm">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                {order.shippingAddress.address1} {order.shippingAddress.address2}<br />
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}<br />
                {order.shippingAddress.country}
             </p>
          </div>
          <div className="border-t border-gray-100 pt-4 mt-4">
             <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">{t('checkout.totalPaid')}</span>
                <span className="font-bold text-xl text-brand-green">{fmt(order.total)}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

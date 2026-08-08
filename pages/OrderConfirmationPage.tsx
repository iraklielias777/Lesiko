
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Loader2, XCircle, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Order } from '../types';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { useFormatPrice } from '../lib/format';
import { PaymentService } from '../services/payment-service';
import { useCartStore } from '../store/cart-store';
import { useAuthStore } from '../store/auth-store';

export const OrderConfirmationPage = () => {
  const fmt = useFormatPrice();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const clearCart = useCartStore(s => s.clearCart);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const orderId =
    params.get('order') ||
    sessionStorage.getItem(PaymentService.PENDING_ORDER_KEY) ||
    '';
  const publicToken = PaymentService.getPendingPublicToken() || '';

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!orderId || !publicToken) {
      setError('missing');
      setPolling(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // ~40s at 2s interval

    const tick = async () => {
      try {
        const next = await PaymentService.getOrderStatus(orderId, publicToken);
        if (cancelled) return;
        setOrder(next);

        if (next.paymentStatus === 'paid') {
          clearCart();
          PaymentService.clearPendingCheckout();
          setPolling(false);
          return;
        }
        if (next.paymentStatus === 'failed') {
          setPolling(false);
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          setPolling(false);
          return;
        }
        window.setTimeout(tick, 2000);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Could not load order');
          setPolling(false);
        }
      }
    };

    tick();
    return () => { cancelled = true; };
  }, [orderId, publicToken, clearCart]);

  if (!orderId || !publicToken || error === 'missing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <SEO title={t('checkout.thankYou')} noindex />
        <div className="text-center max-w-md">
          <h1 className="font-heading text-2xl font-bold mb-3">No order to show</h1>
          <p className="text-gray-500 mb-6">Open this page from checkout after paying, or from your account orders.</p>
          <Link to="/products"><Button>{t('checkout.continueShopping')}</Button></Link>
        </div>
      </div>
    );
  }

  const status = order?.paymentStatus || 'pending';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <SEO title={t('checkout.thankYou')} noindex />

      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center mb-8 animate-scale-in">
          {status === 'paid' && (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="font-heading font-bold text-3xl text-gray-900 mb-2">{t('checkout.thankYou')}</h1>
              <p className="text-gray-600 mb-6">
                {t('checkout.orderPlaced')}{' '}
                <span className="font-mono font-bold text-gray-900">#{order?.orderNumber}</span>
              </p>
              <p className="text-sm text-gray-500 mb-8">
                {t('checkout.emailSent')}
                {order?.shippingAddress?.email ? (
                  <>
                    {' '}
                    <span className="font-medium text-gray-900">{order.shippingAddress.email}</span>
                  </>
                ) : null}
              </p>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                {polling
                  ? <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                  : <Clock className="w-10 h-10 text-amber-500" />}
              </div>
              <h1 className="font-heading font-bold text-3xl text-gray-900 mb-2">
                {polling ? 'Confirming payment…' : 'Payment still processing'}
              </h1>
              <p className="text-gray-600 mb-6">
                Order <span className="font-mono font-bold">#{order?.orderNumber || '…'}</span>
                {polling
                  ? ' — waiting for the bank to confirm.'
                  : ' — refresh this page in a moment, or check your email.'}
              </p>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="font-heading font-bold text-3xl text-gray-900 mb-2">Payment failed</h1>
              <p className="text-gray-600 mb-6">
                Order <span className="font-mono font-bold">#{order?.orderNumber}</span> was not charged.
                You can return to checkout and try another card.
              </p>
            </>
          )}

          {error && error !== 'missing' && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
          )}

          <div className="flex justify-center gap-4">
            <Link to="/products">
              <Button variant="outline">{t('checkout.continueShopping')}</Button>
            </Link>
            {status === 'failed' ? (
              <Link to="/checkout">
                <Button rightIcon={<ArrowRight className="w-4 h-4" />}>Try again</Button>
              </Link>
            ) : isAuthenticated ? (
              <Link to="/account/orders">
                <Button rightIcon={<ArrowRight className="w-4 h-4" />}>{t('checkout.trackOrder')}</Button>
              </Link>
            ) : (
              <Link to="/track-order">
                <Button rightIcon={<ArrowRight className="w-4 h-4" />}>{t('checkout.trackOrder')}</Button>
              </Link>
            )}
          </div>
        </div>

        {order && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-heading font-bold text-lg mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-brand-green" />
              {t('checkout.shipmentDetails')}
            </h2>
            <div className="border-t border-gray-100 pt-4">
              <p className="font-medium text-gray-900 mb-1">{t('checkout.shippingTo')}:</p>
              <p className="text-gray-600 text-sm">
                {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}<br />
                {order.shippingAddress?.address1} {order.shippingAddress?.address2}<br />
                {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}<br />
                {order.shippingAddress?.country}
              </p>
            </div>
            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">
                  {status === 'paid' ? t('checkout.totalPaid') : t('common.total')}
                </span>
                <span className="font-bold text-xl text-brand-green">{fmt(order.total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

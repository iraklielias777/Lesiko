
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth-store';
import { OrderService } from '../services/order-service';
import { Order } from '../types';
import { SEO } from '../components/seo/SEO';
import { useFormatPrice } from '../lib/format';
import { Button } from '../components/ui/Button';
import { useCartStore } from '../store/cart-store';
import { useToastStore } from '../store/toast-store';

export const AccountOrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { t } = useTranslation();
  const fmt = useFormatPrice();
  const { user, isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useToastStore((s) => s.addToast);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderId || !user?.email) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const next = await OrderService.getOrderById(orderId);
      if (cancelled) return;
      if (!next || next.shippingAddress?.email?.toLowerCase() !== user.email.toLowerCase()) {
        // RLS may already hide it; treat as not found.
        setNotFound(true);
        setOrder(null);
      } else {
        setOrder(next);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orderId, user?.email]);

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-20">
      <SEO title={t('account.orderDetail')} noindex />
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <Link to="/account/orders" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-dark mb-6">
          <ArrowLeft className="w-4 h-4" /> {t('account.orderHistory')}
        </Link>

        {loading && <p className="text-gray-500">Loading…</p>}
        {notFound && !loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="mb-4">{t('account.orderNotFound')}</p>
            <Link to="/account/orders"><Button>{t('account.orderHistory')}</Button></Link>
          </div>
        )}

        {order && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex flex-wrap justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">{t('account.orderNumber')}</p>
                  <h1 className="font-heading text-2xl font-bold">#{order.orderNumber}</h1>
                  <p className="text-sm text-gray-500 mt-1">{order.createdAt}</p>
                </div>
                <div className="text-right space-y-1">
                  <div className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {t(`status.${order.status}`, order.status || '')}
                  </div>
                  <p className="text-sm text-gray-500">
                    {t('checkout.paymentStatus')}:{' '}
                    <span className="font-medium capitalize">{order.paymentStatus}</span>
                  </p>
                  {order.flittPaymentId && (
                    <p className="text-xs text-gray-400 font-mono">Flitt: {order.flittPaymentId}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-heading font-bold text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-brand-green" /> {t('checkout.shipmentDetails')}
              </h2>
              <div className="space-y-3 mb-6">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-4 text-sm border-b border-gray-50 pb-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.product.name}
                        {item.selectedVariant?.name ? ` · ${item.selectedVariant.name}` : ''}
                      </p>
                      <p className="text-gray-500">× {item.quantity}</p>
                      <button
                        type="button"
                        className="text-brand-green font-bold text-xs mt-1"
                        onClick={() => {
                          addItem(item.product, item.quantity, item.selectedVariant);
                          addToast(t('product.buyAgain'));
                        }}
                      >
                        {t('product.buyAgain')}
                      </button>
                    </div>
                    <p className="font-medium">{fmt(item.product.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1 text-sm border-t border-gray-100 pt-4">
                <div className="flex justify-between"><span>{t('cart.subtotal')}</span><span>{fmt(order.subtotal)}</span></div>
                <div className="flex justify-between"><span>{t('checkout.shipping')}</span><span>{fmt(order.shipping)}</span></div>
                <div className="flex justify-between"><span>{t('checkout.estimatedTax')}</span><span>{fmt(order.tax)}</span></div>
                <div className="flex justify-between font-bold text-base pt-2">
                  <span>{t('common.total')}</span><span>{fmt(order.total)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="font-medium mb-2">{t('checkout.shippingTo')}</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}<br />
                {order.shippingAddress?.phone && <>{order.shippingAddress.phone}<br /></>}
                {order.shippingAddress?.address1}<br />
                {order.shippingAddress?.address2 && <>{order.shippingAddress.address2}<br /></>}
                {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}<br />
                {order.shippingAddress?.country}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

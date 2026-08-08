
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PaymentService } from '../services/payment-service';
import { Order } from '../types';
import { SEO } from '../components/seo/SEO';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useFormatPrice } from '../lib/format';

export const TrackOrderPage = () => {
  const { t } = useTranslation();
  const fmt = useFormatPrice();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const next = await PaymentService.lookupOrder(orderNumber.trim(), email.trim());
      setOrder(next);
    } catch {
      setError(t('account.orderNotFound'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12">
      <SEO title={t('account.trackOrderTitle')} noindex canonicalPath="/track-order" />
      <div className="container mx-auto px-4 max-w-lg">
        <h1 className="font-heading text-3xl font-bold mb-2">{t('account.trackOrderTitle')}</h1>
        <p className="text-gray-500 mb-8">{t('account.trackOrderHint')}</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 mb-8">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md">{error}</div>}
          <Input
            label={t('account.orderNumber')}
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="LK12345678"
            required
          />
          <Input
            label={t('checkout.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" isLoading={loading}>
            {t('account.findOrder')}
          </Button>
        </form>

        {order && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 animate-fade-in">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400 font-bold">{t('account.orderNumber')}</p>
                <p className="font-heading text-xl font-bold">#{order.orderNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{t(`status.${order.status}`, order.status || '')}</p>
                <p className="text-xs text-gray-500 capitalize">{order.paymentStatus}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {order.items?.length || 0} items · {fmt(order.total)}
            </p>
            <Link
              to={`/order-confirmation?order=${order.id}`}
              className="inline-block text-sm font-bold text-brand-green hover:underline"
            >
              {t('account.viewOrder')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

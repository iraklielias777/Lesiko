
import React, { useEffect, useMemo } from 'react';
import { DollarSign, ShoppingBag, Users, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { useFormatPrice } from '../../lib/format';
import { imageUrl } from '../../lib/image-url';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Percentage change of the last 30 days against the 30 before that. Returns
 * null when there is no prior period to compare against, so a brand-new store
 * shows nothing rather than a meaningless "+100%".
 */
const trendOf = (current: number, previous: number): number | null => {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
};

export const AdminDashboard = () => {
  const { t } = useTranslation();
  const { fetchData, orders, products, customers } = useAdminStore();
  const formatPrice = useFormatPrice();

  useEffect(() => {
    fetchData();
  }, []);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;
  const lowStockProducts = products.filter(p => p.inventoryQuantity < 10).length;

  const { revenueTrend, ordersTrend } = useMemo(() => {
    const now = Date.now();
    const inWindow = (from: number, to: number) =>
      orders.filter(o => {
        const at = new Date(o.createdAt).getTime();
        return at >= from && at < to;
      });

    const recent = inWindow(now - 30 * DAY, now + DAY);
    const prior = inWindow(now - 60 * DAY, now - 30 * DAY);
    const sum = (list: typeof orders) => list.reduce((total, o) => total + o.total, 0);

    return {
      revenueTrend: trendOf(sum(recent), sum(prior)),
      ordersTrend: trendOf(recent.length, prior.length),
    };
  }, [orders]);

  // Real units sold, from the line items, rather than a rating proxy.
  const bestSellers = useMemo(() => {
    const sold = new Map<string, number>();
    for (const order of orders) {
      if (order.status === 'Cancelled') continue;
      for (const item of order.items) {
        const id = item.product?.id;
        if (id) sold.set(id, (sold.get(id) || 0) + item.quantity);
      }
    }

    return products
      .map(product => ({ product, units: sold.get(product.id) || 0 }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 4);
  }, [orders, products]);

  const StatsCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {typeof trend === 'number' && (
          <span
            title="Last 30 days vs the 30 before"
            className={`text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
          >
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
        <p className="text-gray-500">{t('admin.dashboardDesc')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={t('admin.totalRevenue')}
          value={formatPrice(totalRevenue)}
          icon={DollarSign}
          color="bg-brand-green text-brand-green"
          trend={revenueTrend}
        />
        <StatsCard
          title={t('account.totalOrders')}
          value={totalOrders}
          icon={ShoppingBag}
          color="bg-blue-500 text-blue-500"
          trend={ordersTrend}
        />
        <StatsCard
          title={t('admin.activeCustomers')}
          value={customers.length.toLocaleString()}
          icon={Users}
          color="bg-purple-500 text-purple-500"
        />
        <StatsCard
          title={t('admin.lowStock')}
          value={lowStockProducts}
          icon={TrendingUp}
          color="bg-orange-500 text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-heading font-bold text-lg mb-6">{t('admin.recentOrders')}</h3>
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                   <tr>
                     <th className="px-4 py-3">{t('admin.orderId')}</th>
                     <th className="px-4 py-3">{t('admin.customer')}</th>
                     <th className="px-4 py-3">{t('admin.amount')}</th>
                     <th className="px-4 py-3">{t('common.status')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.slice(0, 5).map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">#{order.orderNumber}</td>
                      <td className="px-4 py-3 text-gray-600">{order.customerName}</td>
                      <td className="px-4 py-3 font-medium">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                          order.status === 'Shipped' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {t(`status.${order.status}`) || order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-heading font-bold text-lg mb-6">{t('admin.topProducts')}</h3>
          <div className="space-y-4">
             {bestSellers.map(({ product, units }, idx) => (
               <div key={product.id} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-bold text-gray-300 w-6">#{idx + 1}</span>
                  <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                     {product.images[0] && (
                       <img src={imageUrl(product.images[0].url, { width: 96 })} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                     )}
                  </div>
                  <div className="flex-1 min-w-0">
                     <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                     <p className="text-xs text-gray-500">{units} {t('admin.sales')}</p>
                  </div>
                  <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
               </div>
             ))}
             {bestSellers.length === 0 && (
               <p className="text-sm text-gray-400">No products yet.</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

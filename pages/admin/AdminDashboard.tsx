
import React, { useEffect } from 'react';
import { DollarSign, ShoppingBag, Users, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';

export const AdminDashboard = () => {
  const { t } = useTranslation();
  const { fetchData, orders, products } = useAdminStore();

  useEffect(() => {
    fetchData();
  }, []);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;
  const lowStockProducts = products.filter(p => p.inventoryQuantity < 10).length;

  const StatsCard = ({ title, value, icon: Icon, color, trend }: any) => (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
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
          value={`$${totalRevenue.toFixed(2)}`} 
          icon={DollarSign} 
          color="bg-brand-green text-brand-green" 
          trend={12} 
        />
        <StatsCard 
          title={t('account.totalOrders')} 
          value={totalOrders} 
          icon={ShoppingBag} 
          color="bg-blue-500 text-blue-500" 
          trend={8} 
        />
        <StatsCard 
          title={t('admin.activeCustomers')} 
          value="1,245" 
          icon={Users} 
          color="bg-purple-500 text-purple-500" 
          trend={24} 
        />
        <StatsCard 
          title={t('admin.lowStock')} 
          value={lowStockProducts} 
          icon={TrendingUp} 
          color="bg-orange-500 text-orange-500" 
          trend={-2} 
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
                      <td className="px-4 py-3 font-medium">${order.total.toFixed(2)}</td>
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
             {products.sort((a,b) => b.averageRating - a.averageRating).slice(0, 4).map((product, idx) => (
               <div key={product.id} className="flex items-center gap-4 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-bold text-gray-300 w-6">#{idx + 1}</span>
                  <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                     <img src={product.images[0]?.url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                     <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
                     <p className="text-xs text-gray-500">{product.reviewCount} {t('admin.sales')}</p>
                  </div>
                  <span className="font-bold text-gray-900">${product.price}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

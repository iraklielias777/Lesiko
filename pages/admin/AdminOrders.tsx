
import React, { useEffect, useState } from 'react';
import { Search, Eye, Filter, X, Package, Printer, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Order } from '../../types';

export const AdminOrders = () => {
  const { t } = useTranslation();
  const { fetchData, orders, updateOrderStatus } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Order ID,Date,Customer,Total,Status,Payment\n"
        + filteredOrders.map(o => `${o.orderNumber},${o.createdAt},${o.customerName},${o.total},${o.status},${o.paymentStatus}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "orders.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.orders')}</h1>
           <p className="text-gray-500">{t('admin.manageOrders') || "Manage customer orders and shipments."}</p>
        </div>
        <Button variant="outline" onClick={handleExport} leftIcon={<Download className="w-4 h-4" />}>
            {t('common.export')}
        </Button>
      </div>

      <div className="relative max-w-md">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
         <input 
            type="text" 
            placeholder={t('common.search')} 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-green outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                   <tr>
                     <th className="px-6 py-4">{t('admin.orderId')}</th>
                     <th className="px-6 py-4">{t('common.date')}</th>
                     <th className="px-6 py-4">{t('admin.customer')}</th>
                     <th className="px-6 py-4">{t('common.total')}</th>
                     <th className="px-6 py-4">{t('admin.payment')}</th>
                     <th className="px-6 py-4">{t('common.status')}</th>
                     <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-gray-900">#{order.orderNumber}</td>
                      <td className="px-6 py-4 text-gray-500">{order.createdAt}</td>
                      <td className="px-6 py-4 font-medium">{order.customerName}</td>
                      <td className="px-6 py-4">${order.total.toFixed(2)}</td>
                      <td className="px-6 py-4">
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                              {order.paymentStatus}
                          </span>
                      </td>
                      <td className="px-6 py-4">
                         <select 
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                            className={`border-none text-xs font-bold px-2 py-1 rounded-full cursor-pointer outline-none focus:ring-2 focus:ring-brand-green/50 ${
                                order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                order.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                                order.status === 'Shipped' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                            }`}
                         >
                             <option value="Processing">{t('status.Processing')}</option>
                             <option value="Shipped">{t('status.Shipped')}</option>
                             <option value="Delivered">{t('status.Delivered')}</option>
                             <option value="Cancelled">{t('status.Cancelled')}</option>
                         </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button 
                            onClick={() => setSelectedOrder(order)}
                            className="text-gray-400 hover:text-brand-green transition-colors"
                         >
                             <Eye className="w-5 h-5" />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
         </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm print:hidden" onClick={() => setSelectedOrder(null)} />
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative z-10 animate-scale-in flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:h-auto print:max-h-none">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 print:hidden">
                    <div>
                        <h2 className="font-heading font-bold text-xl">{t('admin.orderId')} #{selectedOrder.orderNumber}</h2>
                        <p className="text-sm text-gray-500">{t('checkout.orderPlaced')} {selectedOrder.createdAt}</p>
                    </div>
                    <button onClick={() => setSelectedOrder(null)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                {/* Print Header */}
                <div className="hidden print:block p-8 pb-0">
                    <h1 className="text-2xl font-bold mb-2">{t('account.invoice')}</h1>
                    <p>{t('admin.orderId')} #{selectedOrder.orderNumber}</p>
                    <p>{selectedOrder.createdAt}</p>
                </div>
                
                <div className="p-6 overflow-y-auto print:overflow-visible">
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Package className="w-4 h-4 text-brand-green print:hidden" /> {t('account.shippingDetails')}
                            </h3>
                            <p className="text-sm text-gray-600">
                                {selectedOrder.customerName}<br />
                                123 Mock Street<br />
                                Los Angeles, CA 90210<br />
                                United States
                            </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-2">{t('checkout.orderSummary')}</h3>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('common.subtotal')}:</span>
                                    <span>${selectedOrder.subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('common.shipping')}:</span>
                                    <span>${selectedOrder.shipping.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('common.tax')}:</span>
                                    <span>${selectedOrder.tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1">
                                    <span>{t('common.total')}:</span>
                                    <span>${selectedOrder.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-4">{t('common.items')}</h3>
                    <div className="space-y-3">
                         {/* Mock Items Logic */}
                         <div className="flex items-center gap-4 border border-gray-100 p-3 rounded-lg print:border-0 print:p-0 print:mb-2">
                             <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden print:hidden">
                                 <img src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=200" alt="" className="w-full h-full object-cover" />
                             </div>
                             <div className="flex-1">
                                 <p className="font-medium text-gray-900">Hydra-Glow Vitamin C Serum</p>
                                 <p className="text-xs text-gray-500">{t('product.qty')}: 1</p>
                             </div>
                             <span className="font-medium">$45.00</span>
                         </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl print:hidden">
                    <Button variant="outline" onClick={() => setSelectedOrder(null)}>{t('common.close')}</Button>
                    <Button onClick={handlePrint} leftIcon={<Printer className="w-4 h-4" />}>{t('common.print')}</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

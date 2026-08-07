
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Eye, X, Package, Printer, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Pagination, usePagination } from '../../components/admin/Pagination';
import { Order } from '../../types';
import { useFormatPrice } from '../../lib/format';
import { useToastStore } from '../../store/toast-store';

const paymentBadge = (status: Order['paymentStatus']) => {
  if (status === 'paid') return 'bg-green-100 text-green-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-800';
};

export const AdminOrders = () => {
  const fmt = useFormatPrice();
  const { t } = useTranslation();
  const { fetchData, orders, updateOrderStatus, updatePaymentStatus, isLoading } = useAdminStore();
  const addToast = useToastStore(s => s.addToast);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | NonNullable<Order['status']>>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | Order['paymentStatus']>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.shippingAddress?.email || '').toLowerCase().includes(q)
      );
    });
  }, [orders, searchTerm, statusFilter, paymentFilter]);

  const pager = usePagination(filteredOrders, 25, [searchTerm, statusFilter, paymentFilter]);

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

  const changeStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateOrderStatus(orderId, status);
      setSelectedOrder(prev => prev?.id === orderId ? { ...prev, status } : prev);
    } catch (e: any) {
      addToast(e?.message || 'Could not update status', 'error');
    }
  };

  const changePayment = async (orderId: string, paymentStatus: Order['paymentStatus']) => {
    try {
      await updatePaymentStatus(orderId, paymentStatus);
      setSelectedOrder(prev => prev?.id === orderId ? { ...prev, paymentStatus } : prev);
    } catch (e: any) {
      addToast(e?.message || 'Could not update payment', 'error');
    }
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

      <div className="flex flex-col sm:flex-row gap-3">
         <div className="relative flex-1 max-w-md">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
           <input
              type="text"
              placeholder={`${t('common.search')} order #, customer, email…`}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-green outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
           />
         </div>
         <select
           value={statusFilter}
           onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
           className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-green"
         >
           <option value="all">All statuses</option>
           <option value="Processing">{t('status.Processing')}</option>
           <option value="Shipped">{t('status.Shipped')}</option>
           <option value="Delivered">{t('status.Delivered')}</option>
           <option value="Cancelled">{t('status.Cancelled')}</option>
         </select>
         <select
           value={paymentFilter}
           onChange={e => setPaymentFilter(e.target.value as typeof paymentFilter)}
           className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-green"
         >
           <option value="all">All payments</option>
           <option value="pending">Pending</option>
           <option value="paid">Paid</option>
           <option value="failed">Failed</option>
         </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
         {isLoading && orders.length === 0 ? (
           <div className="p-12 text-center text-gray-400 text-sm">Loading orders…</div>
         ) : filteredOrders.length === 0 ? (
           <div className="p-12 text-center text-gray-400 text-sm">
             {orders.length === 0 ? 'No orders yet.' : 'No orders match these filters.'}
           </div>
         ) : (
         <>
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
                  {pager.pageItems.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-gray-900">#{order.orderNumber}</td>
                      <td className="px-6 py-4 text-gray-500">{order.createdAt}</td>
                      <td className="px-6 py-4 font-medium">{order.customerName}</td>
                      <td className="px-6 py-4">{fmt(order.total)}</td>
                      <td className="px-6 py-4">
                         <select
                            value={order.paymentStatus}
                            onChange={(e) => changePayment(order.id, e.target.value as Order['paymentStatus'])}
                            className={`border-none text-xs font-bold px-2 py-1 rounded-full cursor-pointer outline-none focus:ring-2 focus:ring-brand-green/50 uppercase ${paymentBadge(order.paymentStatus)}`}
                         >
                             <option value="pending">pending</option>
                             <option value="paid">paid</option>
                             <option value="failed">failed</option>
                         </select>
                      </td>
                      <td className="px-6 py-4">
                         <select
                            value={order.status}
                            onChange={(e) => changeStatus(order.id, e.target.value as Order['status'])}
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
         <Pagination
           page={pager.page}
           pageCount={pager.pageCount}
           total={pager.total}
           firstIndex={pager.firstIndex}
           lastIndex={pager.lastIndex}
           onChange={pager.setPage}
           noun="orders"
         />
         </>
         )}
      </div>

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
                                {[
                                    selectedOrder.customerName,
                                    selectedOrder.shippingAddress?.address1,
                                    selectedOrder.shippingAddress?.address2,
                                    [
                                        selectedOrder.shippingAddress?.city,
                                        selectedOrder.shippingAddress?.state,
                                        selectedOrder.shippingAddress?.zip,
                                    ].filter(Boolean).join(', '),
                                    selectedOrder.shippingAddress?.country,
                                    selectedOrder.shippingAddress?.email,
                                ]
                                    .filter(Boolean)
                                    .map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>)}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-2">{t('checkout.orderSummary')}</h3>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('common.subtotal')}:</span>
                                    <span>{fmt(selectedOrder.subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('common.shipping')}:</span>
                                    <span>{fmt(selectedOrder.shipping)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">{t('common.tax')}:</span>
                                    <span>{fmt(selectedOrder.tax)}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t border-gray-200 pt-1 mt-1">
                                    <span>{t('common.total')}:</span>
                                    <span>{fmt(selectedOrder.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-4">{t('common.items')}</h3>
                    <div className="space-y-3">
                         {selectedOrder.items.length === 0 && (
                             <p className="text-sm text-gray-400">No line items recorded for this order.</p>
                         )}
                         {selectedOrder.items.map(item => (
                             <div key={item.id} className="flex items-center gap-4 border border-gray-100 p-3 rounded-lg print:border-0 print:p-0 print:mb-2">
                                 <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden print:hidden">
                                     {item.product.images?.[0]?.url && (
                                         <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                                     )}
                                 </div>
                                 <div className="flex-1">
                                     <p className="font-medium text-gray-900">
                                         {item.product.name}
                                         {item.selectedVariant && (
                                             <span className="text-gray-500 font-normal"> · {item.selectedVariant.name}</span>
                                         )}
                                     </p>
                                     <p className="text-xs text-gray-500">{t('product.qty')}: {item.quantity}</p>
                                 </div>
                                 <span className="font-medium">{fmt(item.product.price * item.quantity)}</span>
                             </div>
                         ))}
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

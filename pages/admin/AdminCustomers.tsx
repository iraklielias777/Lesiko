
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Mail, MoreHorizontal, Download, ShoppingBag, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminStore } from '../../store/admin-store';
import { Button } from '../../components/ui/Button';
import { Pagination, usePagination } from '../../components/admin/Pagination';
import { User as UserType } from '../../types';
import { useFormatPrice } from '../../lib/format';
import { useToastStore } from '../../store/toast-store';
import { useAuthStore } from '../../store/auth-store';

export const AdminCustomers = () => {
  const { t, i18n } = useTranslation();
  const { fetchData, customers, orders, updateCustomerRole, isLoading } = useAdminStore();
  const currentUser = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const formatPrice = useFormatPrice();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'admin'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<UserType | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  const formatJoined = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString(i18n.language === 'ka' ? 'ka-GE' : 'en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return customers.filter(c => {
      if (roleFilter !== 'all' && (c.role || 'customer') !== roleFilter) return false;
      if (!q) return true;
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [customers, searchTerm, roleFilter]);

  const pager = usePagination(filteredCustomers, 25, [searchTerm, roleFilter]);

  // Orders are keyed by the email captured at checkout, which is the only
  // field a guest order and a profile reliably share.
  const getCustomerStats = (customer: UserType) => {
      const email = customer.email.toLowerCase();
      const customerOrders = email
        ? orders.filter(o => o.shippingAddress?.email?.toLowerCase() === email)
        : [];
      const totalSpent = customerOrders.reduce((sum, o) => sum + o.total, 0);
      return { count: customerOrders.length, total: totalSpent, history: customerOrders };
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
        + "ID,First Name,Last Name,Email,Role,Skin Type,Joined\n"
        + filteredCustomers.map(c => `${c.id},${c.firstName},${c.lastName},${c.email},${c.role},${c.skinType || ''},${c.createdAt || ''}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRoleChange = async (role: UserType['role']) => {
    if (!selectedCustomer || !role) return;
    if (selectedCustomer.id === currentUser?.id && role !== 'admin') {
      addToast('You cannot demote your own account while signed in.', 'error');
      return;
    }
    if (role === 'admin' && !window.confirm(`Promote ${selectedCustomer.email} to admin? They will gain full store access.`)) {
      return;
    }
    if (role === 'customer' && selectedCustomer.role === 'admin' && !window.confirm(`Remove admin access from ${selectedCustomer.email}?`)) {
      return;
    }
    setSavingRole(true);
    try {
      await updateCustomerRole(selectedCustomer.id, role);
      setSelectedCustomer(prev => prev ? { ...prev, role } : prev);
      addToast('Role updated', 'success');
    } catch (e: any) {
      addToast(e?.message || 'Could not update role', 'error');
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.customers')}</h1>
           <p className="text-gray-500">{t('admin.manageCustomersDesc')}</p>
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
              placeholder={t('common.search')}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-green outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
           />
         </div>
         <select
           value={roleFilter}
           onChange={e => setRoleFilter(e.target.value as typeof roleFilter)}
           className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-green"
         >
           <option value="all">All roles</option>
           <option value="customer">Customers</option>
           <option value="admin">Admins</option>
         </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
         {isLoading && customers.length === 0 ? (
           <div className="p-12 text-center text-gray-400 text-sm">Loading customers…</div>
         ) : filteredCustomers.length === 0 ? (
           <div className="p-12 text-center text-gray-400 text-sm">
             {customers.length === 0 ? 'No customers yet.' : 'No customers match these filters.'}
           </div>
         ) : (
         <>
         <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                   <tr>
                     <th className="px-6 py-4">{t('admin.customer')}</th>
                     <th className="px-6 py-4">{t('checkout.email')}</th>
                     <th className="px-6 py-4">Role</th>
                     <th className="px-6 py-4">{t('account.skinProfile')}</th>
                     <th className="px-6 py-4">{t('admin.orders')}</th>
                     <th className="px-6 py-4">{t('account.memberSince')}</th>
                     <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pager.pageItems.map(customer => (
                    <tr key={customer.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green font-bold text-sm">
                                {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">{customer.firstName} {customer.lastName}</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                         <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {customer.email}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                           customer.role === 'admin' ? 'bg-brand-green/15 text-brand-dark' : 'bg-gray-100 text-gray-600'
                         }`}>
                           {customer.role || 'customer'}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                         {customer.skinType ? (
                            <span className="px-2 py-1 rounded bg-gray-100 text-xs font-medium capitalize">
                                {customer.skinType}
                            </span>
                         ) : (
                            <span className="text-gray-400 italic">{t('common.notSet')}</span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{getCustomerStats(customer).count}</td>
                      <td className="px-6 py-4 text-gray-600">{formatJoined(customer.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                         <button
                            onClick={() => setSelectedCustomer(customer)}
                            className="text-gray-400 hover:text-brand-green transition-colors p-2 hover:bg-gray-100 rounded-full"
                         >
                             <MoreHorizontal className="w-5 h-5" />
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
           noun="customers"
         />
         </>
         )}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative z-10 animate-scale-in flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="font-heading font-bold text-xl">{t('admin.customerProfile')}</h2>
                        <p className="text-sm text-gray-500">{t('account.memberSince')} {formatJoined(selectedCustomer.createdAt)}</p>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green font-bold text-3xl">
                             {selectedCustomer.firstName.charAt(0)}{selectedCustomer.lastName.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-2xl text-gray-900">{selectedCustomer.firstName} {selectedCustomer.lastName}</h3>
                            <div className="flex items-center gap-2 text-gray-500 mt-1">
                                <Mail className="w-4 h-4" /> {selectedCustomer.email}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                                <span className="px-2 py-1 rounded bg-gray-100 text-xs font-medium uppercase tracking-wider text-gray-600">
                                    {selectedCustomer.skinType || t('common.notSet')}
                                </span>
                                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                                  Role
                                  <select
                                    value={selectedCustomer.role || 'customer'}
                                    disabled={savingRole}
                                    onChange={e => handleRoleChange(e.target.value as UserType['role'])}
                                    className="normal-case font-medium tracking-normal border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-brand-green disabled:opacity-50"
                                  >
                                    <option value="customer">Customer</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </label>
                            </div>
                        </div>
                    </div>

                    {(() => {
                        const stats = getCustomerStats(selectedCustomer);
                        return (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <p className="text-xs text-gray-500 uppercase font-bold">{t('admin.totalSpent')}</p>
                                        <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.total)}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <p className="text-xs text-gray-500 uppercase font-bold">{t('account.totalOrders')}</p>
                                        <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <ShoppingBag className="w-4 h-4 text-brand-green" /> {t('admin.recentOrders')}
                                    </h4>
                                    {stats.history.length > 0 ? (
                                        <div className="space-y-3">
                                            {stats.history.map(order => (
                                                <div key={order.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{t('admin.orderId')} #{order.orderNumber}</p>
                                                        <p className="text-xs text-gray-500">{order.createdAt}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium">{formatPrice(order.total)}</p>
                                                        <span className="text-xs text-green-600 font-bold">{t(`status.${order.status}`) || order.status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">{t('admin.noOrdersCustomer')}</p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div className="p-6 border-t border-gray-100 flex justify-end bg-gray-50 rounded-b-xl">
                    <Button variant="outline" onClick={() => setSelectedCustomer(null)}>{t('common.close')}</Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

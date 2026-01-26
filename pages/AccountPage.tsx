
import React, { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';
import { useToastStore } from '../store/toast-store';
import { AuthService } from '../services/auth-service';
import { OrderService } from '../services/order-service';
import { 
  Package, 
  User, 
  MapPin, 
  LogOut, 
  ChevronRight, 
  CreditCard, 
  Heart,
  Box,
  Truck,
  Plus,
  ArrowLeft,
  ShoppingBag,
  ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Address, Order } from '../types';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';

// Mock Address Data
const INITIAL_ADDRESSES: (Address & { id: string, isDefault: boolean })[] = [
    { id: 'addr_1', isDefault: true, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', address1: '123 Beauty Lane, Suite 400', city: 'Los Angeles', state: 'CA', zip: '90012', country: 'United States' }
];

type TabType = 'overview' | 'orders' | 'profile' | 'addresses';

export const AccountPage = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const addItemToCart = useCartStore(state => state.addItem);
  const addToast = useToastStore(state => state.addToast);
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [orderList, setOrderList] = useState<Order[]>([]);
  
  // Address State
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<Address>({
      firstName: '', lastName: '', email: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'United States'
  });

  useEffect(() => {
      if (user?.email) {
          OrderService.getOrdersByUser(user.email).then(setOrderList);
      }
  }, [user]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  const handleLogout = async () => {
    await AuthService.logout();
    logout();
  };

  const handleBuyAgain = (item: any) => {
      addItemToCart(item.product);
  };

  const handleEditAddress = (addr: typeof addresses[0]) => {
      setAddressForm(addr);
      setEditingAddressId(addr.id);
      setIsAddressFormOpen(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingAddressId) {
          setAddresses(prev => prev.map(a => a.id === editingAddressId ? { ...addressForm, id: a.id, isDefault: a.isDefault } : a));
          addToast("Address updated successfully");
      } else {
          setAddresses(prev => [...prev, { ...addressForm, id: crypto.randomUUID(), isDefault: prev.length === 0 }]);
          addToast("New address added");
      }
      setIsAddressFormOpen(false);
      setEditingAddressId(null);
      // Reset form
      setAddressForm({ firstName: '', lastName: '', email: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'United States' });
  };

  const handleDeleteAddress = (id: string) => {
      if (confirm('Are you sure you want to delete this address?')) {
          setAddresses(prev => prev.filter(a => a.id !== id));
          addToast("Address deleted", 'info');
      }
  };

  const NavItem = ({ tab, icon: Icon, label }: { tab: TabType; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-300 rounded-lg group whitespace-nowrap ${
        activeTab === tab
          ? 'bg-brand-green/10 text-brand-dark'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-4 h-4 transition-colors flex-shrink-0 ${activeTab === tab ? 'text-brand-green' : 'text-gray-400 group-hover:text-gray-600'}`} />
      {label}
      {activeTab === tab && <ChevronRight className="w-4 h-4 ml-auto text-brand-green animate-fade-in hidden lg:block" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FAFAF9] pb-20">
      <SEO title={t('common.myAccount')} noindex />

      {/* Header Area */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center text-3xl font-heading font-bold text-brand-green border-2 border-white shadow-lg">
              {user.firstName.charAt(0)}
            </div>
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {t('account.hello')}, {user.firstName}
              </h1>
              <p className="text-gray-500 font-light">{t('account.memberSince')} 2023 • {user.skinType ? <span className="capitalize">{t(`skinTypes.${user.skinType}`, user.skinType) as string} {t('common.skin') as string}</span> : t('account.skinProfileIncomplete') as string}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Navigation - Sidebar on Desktop, Horizontal Scroll on Mobile */}
          <div className="lg:col-span-1">
             <div className="bg-white p-2 lg:p-4 rounded-xl lg:rounded-2xl border border-gray-100 shadow-sm sticky top-24">
                {/* Mobile: Horizontal Scroll */}
                <nav className="flex lg:flex-col overflow-x-auto pb-2 lg:pb-0 gap-2 lg:gap-2 no-scrollbar">
                    <NavItem tab="overview" icon={Box} label={t('account.overview')} />
                    <NavItem tab="orders" icon={Package} label={t('account.orderHistory')} />
                    <NavItem tab="addresses" icon={MapPin} label={t('account.addresses')} />
                    <NavItem tab="profile" icon={User} label={t('account.profileSettings')} />
                    <Link to="/wishlist" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-lg group transition-all whitespace-nowrap min-w-max">
                        <Heart className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        {t('common.wishlist')}
                    </Link>
                </nav>

                <div className="hidden lg:block mt-8 p-4 bg-brand-dark rounded-2xl text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                    <h3 className="font-heading font-bold text-lg mb-2 relative z-10">{t('account.needHelp')}</h3>
                    <p className="text-gray-400 text-sm mb-4 relative z-10">Our beauty experts are here to assist you.</p>
                    <Button size="sm" variant="secondary" className="w-full relative z-10 !bg-white/10 !text-white !border-white/20 hover:!bg-white hover:!text-brand-dark">{t('account.contactSupport')}</Button>
                </div>

                <div className="hidden lg:block mt-6 px-4">
                    <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors"
                    >
                    <LogOut className="w-4 h-4" /> {t('common.logOut')}
                    </button>
                </div>
             </div>
             
             {/* Mobile Logout (Separate) */}
             <div className="lg:hidden mt-6 text-center">
                 <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-red-500 underline">{t('common.logOut')}</button>
             </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 min-h-[500px]">
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fade-in">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: t('account.totalOrders'), val: orderList.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: t('account.activeShipments'), val: orderList.filter(o => o.status === 'Shipped').length, icon: Truck, color: 'text-brand-green', bg: 'bg-green-50' },
                    { label: t('account.rewardPoints'), val: '150', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-full flex items-center justify-center`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.val}</p>
                        </div>
                    </div>
                  ))}
                </div>

                {/* Recent Order Preview */}
                {orderList.length > 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-heading font-bold text-lg">{t('account.recentOrder')}</h3>
                        <button onClick={() => setActiveTab('orders')} className="text-sm text-brand-green font-semibold hover:underline">{t('common.viewAll')}</button>
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            <div className="flex -space-x-4 overflow-hidden py-2">
                                {orderList[0].items.map((item, i) => (
                                <img key={i} src={item.product.images[0]?.url} alt={item.product.name} className="inline-block h-16 w-16 rounded-full ring-2 ring-white object-cover" />
                                ))}
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <p className="font-bold text-gray-900 text-lg">#{orderList[0].orderNumber}</p>
                                <p className="text-gray-500 text-sm">{orderList[0].createdAt}</p>
                            </div>
                            <div className="text-right">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                                    orderList[0].status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                    orderList[0].status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {t(`status.${orderList[0].status}`) || orderList[0].status}
                                </div>
                                <p className="font-bold text-gray-900">${orderList[0].total.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-100 flex gap-4">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setActiveTab('orders')}>View Details</Button>
                            <Button size="sm" className="flex-1">{t('product.trackPackage')}</Button>
                        </div>
                    </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                        <h3 className="font-heading font-bold text-lg mb-2">{t('account.noOrders')}</h3>
                        <p className="text-gray-500 text-sm mb-4">You haven't placed any orders yet.</p>
                        <Link to="/products">
                            <Button size="sm">{t('account.startShopping')}</Button>
                        </Link>
                    </div>
                )}

                {/* Address Snippet */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex justify-between items-center">
                   <div>
                       <h3 className="font-heading font-bold text-lg mb-2">{t('account.shippingDetails')}</h3>
                       {addresses.length > 0 ? (
                           <p className="text-gray-600 text-sm">
                               {addresses[0].address1}, {addresses[0].city}, {addresses[0].state}
                           </p>
                       ) : (
                           <p className="text-gray-400 text-sm">No default address set.</p>
                       )}
                   </div>
                   <Button variant="outline" size="sm" onClick={() => setActiveTab('addresses')}>{t('account.manage')}</Button>
                </div>
              </div>
            )}

            {/* ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-6 animate-fade-in">
                 <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">{t('account.orderHistory')}</h2>
                 
                 {orderList.length === 0 ? (
                     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center flex flex-col items-center animate-fade-in-up">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 group border border-gray-100">
                            <ShoppingBag className="w-10 h-10 text-gray-300 group-hover:text-brand-green transition-colors duration-300" />
                        </div>
                        <h3 className="font-heading font-bold text-2xl text-gray-900 mb-2">{t('account.noOrders')}</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg font-light">
                            Looks like you haven't discovered our collection yet. Explore our bestsellers and find your new favorites.
                        </p>
                        <Link to="/products">
                            <Button size="lg" className="shadow-lg shadow-brand-green/20" rightIcon={<ArrowRight className="w-4 h-4"/>}>
                                {t('account.startShopping')}
                            </Button>
                        </Link>
                     </div>
                 ) : (
                    orderList.map((order) => (
                        <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
                        {/* Order Header */}
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center">
                            <div className="flex gap-4 sm:gap-8 flex-wrap">
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('admin.orderId')}</p>
                                    <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('common.total')}</p>
                                    <p className="text-sm font-medium text-gray-900">${order.total.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('common.date')}</p>
                                    <p className="text-sm font-medium text-gray-900">{order.createdAt}</p>
                                </div>
                            </div>
                            <div className="w-full sm:w-auto mt-2 sm:mt-0">
                                <Button variant="outline" size="sm" className="w-full sm:w-auto">{t('account.invoice')}</Button>
                            </div>
                        </div>
                        
                        {/* Order Body */}
                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-2 mb-4">
                                    <div className={`w-2.5 h-2.5 rounded-full ${
                                        order.status === 'Delivered' ? 'bg-green-500' :
                                        order.status === 'Cancelled' ? 'bg-red-500' : 
                                        'bg-blue-500'
                                    }`}></div>
                                    <span className="font-bold text-gray-900">{t(`status.${order.status}`) || order.status}</span>
                                    </div>
                                    <div className="space-y-3">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded border border-gray-100 overflow-hidden bg-gray-50 flex-shrink-0">
                                                <img src={item.product.images[0]?.url} alt={item.product.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                                                <p className="text-xs text-gray-500">{t('product.qty')}: {item.quantity}</p>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-brand-green hover:bg-brand-green/5 text-xs h-8 px-2"
                                                onClick={() => handleBuyAgain(item)}
                                            >
                                                {t('product.buyAgain')}
                                            </Button>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 min-w-[180px] justify-center border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-6">
                                    <Button size="sm">{t('product.trackPackage')}</Button>
                                    <Button variant="outline" size="sm">{t('product.returns')}</Button>
                                </div>
                            </div>
                        </div>
                        </div>
                    ))
                 )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
               <div className="animate-fade-in max-w-2xl">
                  <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">{t('account.personalInfo')}</h2>
                  <p className="text-gray-500 mb-8">Manage your personal details and skin profile.</p>

                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                        <Input label={t('checkout.firstName')} defaultValue={user.firstName} disabled={!isEditingProfile} />
                        <Input label={t('checkout.lastName')} defaultValue={user.lastName} disabled={!isEditingProfile} />
                     </div>
                     <Input label={t('checkout.email')} defaultValue={user.email} disabled />
                     
                     <div className="pt-6 border-t border-gray-100">
                        <h3 className="font-heading font-bold text-lg mb-4">{t('account.skinProfile')}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                           {['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive'].map((type) => (
                              <button
                                 key={type}
                                 disabled={!isEditingProfile}
                                 className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                                    user.skinType?.toLowerCase() === type.toLowerCase()
                                    ? 'border-brand-green bg-brand-green/5 text-brand-dark'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                 } ${!isEditingProfile && 'opacity-70 cursor-not-allowed'}`}
                              >
                                 {t(`skinTypes.${type.toLowerCase()}`, type)}
                              </button>
                           ))}
                        </div>
                     </div>

                     <div className="pt-8 flex justify-end gap-4">
                        {isEditingProfile ? (
                           <>
                              <Button variant="outline" onClick={() => setIsEditingProfile(false)}>{t('common.cancel')}</Button>
                              <Button onClick={() => setIsEditingProfile(false)}>{t('account.saveChanges')}</Button>
                           </>
                        ) : (
                           <Button onClick={() => setIsEditingProfile(true)}>{t('common.edit')}</Button>
                        )}
                     </div>
                  </div>
               </div>
            )}

            {/* ADDRESSES TAB */}
            {activeTab === 'addresses' && (
               <div className="animate-fade-in">
                  {!isAddressFormOpen ? (
                      <>
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">{t('account.addresses')}</h2>
                                <p className="text-gray-500">Manage your shipping and billing addresses.</p>
                            </div>
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                leftIcon={<Plus className="w-4 h-4"/>}
                                onClick={() => {
                                    setAddressForm({ firstName: '', lastName: '', email: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'United States' });
                                    setEditingAddressId(null);
                                    setIsAddressFormOpen(true);
                                }}
                            >
                                {t('account.addNewAddress')}
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {addresses.map((addr) => (
                                <div key={addr.id} className={`bg-white rounded-2xl border p-6 relative shadow-sm transition-all hover:shadow-md ${addr.isDefault ? 'border-brand-green' : 'border-gray-200'}`}>
                                    {addr.isDefault && (
                                        <span className="absolute top-4 right-4 bg-brand-green text-white text-[10px] font-bold uppercase px-2 py-1 rounded">{t('account.default')}</span>
                                    )}
                                    <h3 className="font-bold text-gray-900 mb-1">{addr.firstName} {addr.lastName}</h3>
                                    <div className="text-sm text-gray-600 space-y-1 mb-6 min-h-[60px]">
                                        <p>{addr.address1}</p>
                                        {addr.address2 && <p>{addr.address2}</p>}
                                        <p>{addr.city}, {addr.state} {addr.zip}</p>
                                        <p>{addr.country}</p>
                                    </div>
                                    <div className="flex gap-4 border-t border-gray-100 pt-4">
                                        <button 
                                            onClick={() => handleEditAddress(addr)}
                                            className="text-sm font-medium text-gray-900 hover:text-brand-green transition-colors"
                                        >
                                            {t('common.edit')}
                                        </button>
                                        {!addr.isDefault && (
                                            <button 
                                                onClick={() => handleDeleteAddress(addr.id)}
                                                className="text-sm font-medium text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                {t('common.remove')}
                                            </button>
                                        )}
                                        {!addr.isDefault && (
                                            <button 
                                                onClick={() => {
                                                    setAddresses(prev => prev.map(a => ({...a, isDefault: a.id === addr.id})));
                                                    addToast("Default address updated");
                                                }}
                                                className="text-sm font-medium text-brand-green hover:underline ml-auto"
                                            >
                                                {t('account.setAsDefault')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            
                            <button 
                                onClick={() => {
                                    setAddressForm({ firstName: '', lastName: '', email: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'United States' });
                                    setEditingAddressId(null);
                                    setIsAddressFormOpen(true);
                                }}
                                className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 min-h-[220px] hover:border-brand-green hover:text-brand-green hover:bg-brand-green/5 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-white flex items-center justify-center mb-3 transition-colors">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="font-medium">{t('account.addNewAddress')}</span>
                            </button>
                        </div>
                      </>
                  ) : (
                      <div className="max-w-2xl animate-fade-in">
                          <button 
                            onClick={() => setIsAddressFormOpen(false)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6"
                          >
                             <ArrowLeft className="w-4 h-4" /> {t('common.back')}
                          </button>
                          
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                              <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">
                                  {editingAddressId ? t('common.edit') : t('common.add')}
                              </h2>
                              <form onSubmit={handleSaveAddress} className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                      <Input label={t('checkout.firstName')} value={addressForm.firstName} onChange={(e) => setAddressForm({...addressForm, firstName: e.target.value})} required />
                                      <Input label={t('checkout.lastName')} value={addressForm.lastName} onChange={(e) => setAddressForm({...addressForm, lastName: e.target.value})} required />
                                  </div>
                                  <Input label={t('checkout.address')} value={addressForm.address1} onChange={(e) => setAddressForm({...addressForm, address1: e.target.value})} required />
                                  <Input label={t('checkout.apt')} value={addressForm.address2} onChange={(e) => setAddressForm({...addressForm, address2: e.target.value})} />
                                  <div className="grid grid-cols-3 gap-4">
                                      <Input label={t('checkout.city')} value={addressForm.city} onChange={(e) => setAddressForm({...addressForm, city: e.target.value})} required />
                                      <Input label={t('checkout.state')} value={addressForm.state} onChange={(e) => setAddressForm({...addressForm, state: e.target.value})} required />
                                      <Input label={t('checkout.zip')} value={addressForm.zip} onChange={(e) => setAddressForm({...addressForm, zip: e.target.value})} required />
                                  </div>
                                  <div className="flex gap-4 justify-end pt-4">
                                      <Button type="button" variant="outline" onClick={() => setIsAddressFormOpen(false)}>{t('common.cancel')}</Button>
                                      <Button type="submit">{t('common.save')}</Button>
                                  </div>
                              </form>
                          </div>
                      </div>
                  )}
               </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';
import { useToastStore } from '../store/toast-store';
import { useWishlistStore } from '../store/wishlist-store';
import { AuthService } from '../services/auth-service';
import { OrderService } from '../services/order-service';
import { AddressService } from '../services/address-service';
import {
  Package,
  User,
  MapPin,
  LogOut,
  ChevronRight,
  Heart,
  Box,
  Truck,
  Plus,
  Star,
  Trash2,
  Edit2,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Address, Order, SavedAddress, User as UserType } from '../types';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { useFormatPrice } from '../lib/format';
import { ProductThumb } from '../components/product/ProductThumb';

type TabType = 'overview' | 'orders' | 'profile' | 'addresses';

const TAB_PATH: Record<TabType, string> = {
  overview: '/account',
  orders: '/account/orders',
  addresses: '/account/addresses',
  profile: '/account/profile',
};

const pathToTab = (pathname: string): TabType => {
  if (pathname.endsWith('/orders')) return 'orders';
  if (pathname.endsWith('/addresses')) return 'addresses';
  if (pathname.endsWith('/profile')) return 'profile';
  return 'overview';
};

const EMPTY_ADDRESS: Address = {
  firstName: '', lastName: '', email: '', phone: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'GE',
};

const SKIN_TYPES: NonNullable<UserType['skinType']>[] = ['normal', 'dry', 'oily', 'combination', 'sensitive'];

export const AccountPage = () => {
  const fmt = useFormatPrice();
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const addItemToCart = useCartStore((state) => state.addItem);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const addToast = useToastStore((state) => state.addToast);

  const activeTab = pathToTab(pathname);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [orderList, setOrderList] = useState<Order[]>([]);

  const [profileForm, setProfileForm] = useState<{
    firstName: string;
    lastName: string;
    skinType: UserType['skinType'] | '';
  }>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    skinType: user?.skinType || '',
  });

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<Address>(EMPTY_ADDRESS);

  useEffect(() => {
    if (user?.email) {
      OrderService.getOrdersByUser(user.email).then(setOrderList);
    }
    if (user) {
      setProfileForm({
        firstName: user.firstName,
        lastName: user.lastName,
        skinType: user.skinType || '',
      });
      AddressService.getAddresses(user.id).then(setAddresses);
    }
  }, [user]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  const setTab = (tab: TabType) => navigate(TAB_PATH[tab]);

  const handleLogout = async () => {
    await AuthService.logout();
    logout();
  };

  const handleSaveProfile = async () => {
    try {
      const patch = {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        skinType: profileForm.skinType || undefined,
      };
      await AuthService.updateProfile(user.id, patch);
      updateUser(patch);
      addToast(t('account.profileUpdated'));
      setIsEditingProfile(false);
    } catch {
      addToast(t('account.profileUpdateFailed'), 'error');
    }
  };

  const handleBuyAgain = (item: Order['items'][number]) => {
    addItemToCart(item.product, item.quantity, item.selectedVariant);
    addToast(t('product.buyAgain'));
  };

  const openAddressForm = (addr?: SavedAddress) => {
    if (addr) {
      const { id, isDefault, ...rest } = addr;
      setAddressForm({ ...EMPTY_ADDRESS, ...rest, phone: rest.phone || '' });
      setEditingAddressId(id);
    } else {
      setAddressForm({
        ...EMPTY_ADDRESS,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
      setEditingAddressId(null);
    }
    setIsAddressFormOpen(true);
  };

  const closeAddressForm = () => {
    setIsAddressFormOpen(false);
    setEditingAddressId(null);
    setAddressForm(EMPTY_ADDRESS);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);
    try {
      if (editingAddressId) {
        const saved = await AddressService.updateAddress(editingAddressId, addressForm);
        setAddresses((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
      } else {
        const saved = await AddressService.addAddress(user.id, addressForm, addresses.length === 0);
        setAddresses((prev) => [...prev, saved]);
      }
      closeAddressForm();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save address', 'error');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await AddressService.setDefault(user.id, id);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch {
      addToast(t('account.addressDefaultFailed'), 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm(t('account.confirmDeleteAddress'))) return;
    try {
      await AddressService.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      addToast(t('account.addressDeleteFailed'), 'error');
    }
  };

  const NavItem = ({ tab, icon: Icon, label }: { tab: TabType; icon: any; label: string }) => (
    <button
      type="button"
      onClick={() => setTab(tab)}
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
              <p className="text-gray-500 font-light">
                {t('account.memberSince')}{' '}
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString(i18n.language === 'ka' ? 'ka-GE' : 'en-US', { year: 'numeric', month: 'short' })
                  : '—'}{' '}
                •{' '}
                {user.skinType
                  ? <span className="capitalize">{t(`skinTypes.${user.skinType}`, user.skinType) as string} {t('common.skin') as string}</span>
                  : (t('account.skinProfileIncomplete') as string)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          <div className="lg:col-span-1">
            <div className="bg-white p-2 lg:p-4 rounded-xl lg:rounded-2xl border border-gray-100 shadow-sm sticky top-24">
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
              <div className="mt-4 lg:mt-6 px-4">
                <button type="button" onClick={handleLogout} className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-4 h-4" /> {t('common.logOut')}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 min-h-[500px]">
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { label: t('account.totalOrders'), val: orderList.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: t('account.activeShipments'), val: orderList.filter((o) => o.status === 'Shipped').length, icon: Truck, color: 'text-brand-green', bg: 'bg-green-50' },
                    { label: t('account.itemsSaved'), val: wishlistCount, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
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

                {orderList.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="font-heading font-bold text-lg">{t('account.recentOrder')}</h3>
                      <button type="button" onClick={() => setTab('orders')} className="text-sm text-brand-green font-semibold hover:underline">{t('common.viewAll')}</button>
                    </div>
                    <Link to={`/account/orders/${orderList[0].id}`} className="block p-6 hover:bg-gray-50/50 transition-colors">
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex -space-x-4 overflow-hidden py-2">
                          {orderList[0].items.map((item, i) => (
                            <ProductThumb
                              key={i}
                              product={item.product}
                              alt={item.product.name}
                              size={64}
                              className="inline-block h-16 w-16 rounded-full ring-2 ring-white shrink-0"
                            />
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
                          <p className="font-bold text-gray-900">{fmt(orderList[0].total)}</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
                    <h3 className="font-heading font-bold text-lg mb-2">{t('account.noOrders')}</h3>
                    <p className="text-gray-500 text-sm mb-4">{t('account.noOrdersHint')}</p>
                    <Link to="/products"><Button size="sm">{t('account.startShopping')}</Button></Link>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="font-heading text-2xl font-bold text-gray-900 mb-6">{t('account.orderHistory')}</h2>
                {orderList.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center flex flex-col items-center">
                    <ShoppingBag className="w-10 h-10 text-gray-300 mb-6" />
                    <h3 className="font-heading font-bold text-2xl text-gray-900 mb-2">{t('account.noOrders')}</h3>
                    <Link to="/products">
                      <Button size="lg" className="shadow-lg shadow-brand-green/20" rightIcon={<ArrowRight className="w-4 h-4" />}>
                        {t('account.startShopping')}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  orderList.map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow mb-4">
                      <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex flex-wrap gap-4 justify-between items-center">
                        <div>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('account.orderNumber')}</p>
                          <Link to={`/account/orders/${order.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-green">
                            #{order.orderNumber}
                          </Link>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t('common.total')}</p>
                          <p className="text-sm font-medium text-gray-900">{fmt(order.total)}</p>
                        </div>
                        <Link to={`/account/orders/${order.id}`} className="text-sm font-bold text-brand-green hover:underline">
                          {t('account.viewOrder')}
                        </Link>
                      </div>
                      <div className="p-6">
                        <span className="font-bold text-gray-900">{t(`status.${order.status}`) || order.status}</span>
                        <div className="mt-4 space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>
                                {item.product.name}
                                {item.selectedVariant?.name ? ` (${item.selectedVariant.name})` : ''}
                                {' '}(x{item.quantity})
                              </span>
                              <button type="button" onClick={() => handleBuyAgain(item)} className="text-brand-green font-bold">
                                {t('product.buyAgain')}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h2 className="font-heading text-2xl font-bold text-gray-900">{t('account.addresses')}</h2>
                  {!isAddressFormOpen && (
                    <Button size="sm" onClick={() => openAddressForm()} leftIcon={<Plus className="w-4 h-4" />}>
                      {t('account.addNewAddress')}
                    </Button>
                  )}
                </div>

                {isAddressFormOpen && (
                  <form onSubmit={handleSaveAddress} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-4 animate-fade-in">
                    <h3 className="font-heading font-bold text-lg">
                      {editingAddressId ? t('account.editAddress') : t('account.newAddress')}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label={t('checkout.firstName')} required value={addressForm.firstName} onChange={(e) => setAddressForm({ ...addressForm, firstName: e.target.value })} />
                      <Input label={t('checkout.lastName')} required value={addressForm.lastName} onChange={(e) => setAddressForm({ ...addressForm, lastName: e.target.value })} />
                    </div>
                    <Input label={t('checkout.email')} type="email" required value={addressForm.email} onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })} />
                    <Input label={t('checkout.phone')} type="tel" value={addressForm.phone || ''} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} />
                    <Input label={t('checkout.address')} required value={addressForm.address1} onChange={(e) => setAddressForm({ ...addressForm, address1: e.target.value })} />
                    <Input label={t('checkout.apt')} value={addressForm.address2 || ''} onChange={(e) => setAddressForm({ ...addressForm, address2: e.target.value })} />
                    <div className="grid grid-cols-3 gap-4">
                      <Input label={t('checkout.city')} required value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} />
                      <Input label={t('checkout.state')} required value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} />
                      <Input label={t('checkout.zip')} required value={addressForm.zip} onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })} />
                    </div>
                    <Input label={t('account.country')} required value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} />
                    <div className="pt-4 flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={closeAddressForm}>{t('common.cancel')}</Button>
                      <Button type="submit" isLoading={isSavingAddress}>{t('account.saveChanges')}</Button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 && !isAddressFormOpen ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center flex flex-col items-center">
                    <MapPin className="w-10 h-10 text-gray-300 mb-6" />
                    <h3 className="font-heading font-bold text-2xl text-gray-900 mb-2">{t('account.noAddresses')}</h3>
                    <p className="text-gray-500 text-sm mb-6">{t('account.noAddressesHint')}</p>
                    <Button onClick={() => openAddressForm()} leftIcon={<Plus className="w-4 h-4" />}>{t('account.addNewAddress')}</Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <div key={addr.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                          <p className="font-bold text-gray-900">{addr.firstName} {addr.lastName}</p>
                          {addr.isDefault && (
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-green/10 text-brand-green px-2 py-1 rounded">{t('account.default')}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed flex-1">
                          {addr.phone && <>{addr.phone}<br /></>}
                          {addr.address1}<br />
                          {addr.address2 && <>{addr.address2}<br /></>}
                          {addr.city}, {addr.state} {addr.zip}<br />
                          {addr.country}
                        </p>
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                          <button type="button" onClick={() => openAddressForm(addr)} className="text-xs font-bold text-gray-500 hover:text-brand-green flex items-center gap-1">
                            <Edit2 className="w-3 h-3" /> {t('common.edit')}
                          </button>
                          {!addr.isDefault && (
                            <button type="button" onClick={() => handleSetDefaultAddress(addr.id)} className="text-xs font-bold text-gray-500 hover:text-brand-green flex items-center gap-1">
                              <Star className="w-3 h-3" /> {t('account.setAsDefault')}
                            </button>
                          )}
                          <button type="button" onClick={() => handleDeleteAddress(addr.id)} className="text-xs font-bold text-gray-400 hover:text-red-500 flex items-center gap-1 ml-auto">
                            <Trash2 className="w-3 h-3" /> {t('common.remove')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="animate-fade-in max-w-2xl">
                <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">{t('account.personalInfo')}</h2>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <Input
                      label={t('checkout.firstName')}
                      value={profileForm.firstName}
                      disabled={!isEditingProfile}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    />
                    <Input
                      label={t('checkout.lastName')}
                      value={profileForm.lastName}
                      disabled={!isEditingProfile}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    />
                  </div>
                  <Input label={t('checkout.email')} value={user.email} disabled />
                  <div className="pt-6 border-t border-gray-100">
                    <h3 className="font-heading font-bold text-lg mb-4">{t('account.skinProfile')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {SKIN_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          disabled={!isEditingProfile}
                          onClick={() => setProfileForm({ ...profileForm, skinType: type })}
                          className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all capitalize ${
                            profileForm.skinType === type
                              ? 'border-brand-green bg-brand-green/5 text-brand-dark'
                              : 'border-gray-200 text-gray-500'
                          } ${!isEditingProfile && 'opacity-70 cursor-not-allowed'}`}
                        >
                          {t(`skinTypes.${type}`, type)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-8 flex justify-end gap-4">
                    {isEditingProfile ? (
                      <>
                        <Button variant="outline" onClick={() => setIsEditingProfile(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSaveProfile}>{t('account.saveChanges')}</Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditingProfile(true)}>{t('common.edit')}</Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

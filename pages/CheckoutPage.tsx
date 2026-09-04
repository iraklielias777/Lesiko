
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CreditCard, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../store/cart-store';
import { useAuthStore } from '../store/auth-store';
import { useSettingsStore, calculateTotals } from '../store/settings-store';
import { Button } from '../components/ui/Button';
import { OrderSummary } from '../components/checkout/OrderSummary';
import { cartCheckoutFingerprint, PaymentService } from '../services/payment-service';
import { AddressService } from '../services/address-service';
import { Order, SavedAddress } from '../types';
import { SEO } from '../components/seo/SEO';
import { useFormatPrice } from '../lib/format';
import { splitWordmark } from '../lib/wordmark';

type CheckoutStep = 'shipping' | 'payment';

export const CheckoutPage = () => {
  const fmt = useFormatPrice();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { items, getSubtotal, refreshPrices } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const settings = useSettingsStore(s => s.settings);
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(
    () => sessionStorage.getItem(PaymentService.PENDING_ORDER_KEY),
  );
  const [chargedTotal, setChargedTotal] = useState<number | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [saveAddress, setSaveAddress] = useState(false);
  const flittRootRef = useRef<HTMLDivElement>(null);
  const mountedTokenRef = useRef<string | null>(null);
  const prefilledRef = useRef(false);

  const [address, setAddress] = useState({
    email: '', firstName: '', lastName: '', phone: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'GE'
  });

  const subtotal = getSubtotal();
  const { shipping, tax, total } = calculateTotals(subtotal, settings);
  const displayTotal = chargedTotal ?? total;
  const [wmBefore, wmAccent] = splitWordmark(settings.storeName || 'LesiKo');

  // Refresh sale/catalogue prices as soon as checkout opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      try {
        await refreshPrices();
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshPrices]);

  // Prefill from signed-in profile + address book.
  useEffect(() => {
    if (!isAuthenticated || !user || prefilledRef.current) return;
    prefilledRef.current = true;
    setAddress((prev) => ({
      ...prev,
      email: user.email,
      firstName: prev.firstName || user.firstName,
      lastName: prev.lastName || user.lastName,
    }));
    AddressService.getAddresses(user.id).then((list) => {
      setSavedAddresses(list);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def) {
        setSelectedAddressId(def.id);
        setAddress({
          email: user.email,
          firstName: def.firstName,
          lastName: def.lastName,
          phone: def.phone || '',
          address1: def.address1,
          address2: def.address2 || '',
          city: def.city,
          state: def.state,
          zip: def.zip,
          country: def.country || 'GE',
        });
      }
    });
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!refreshing && items.length === 0 && step === 'shipping') {
      navigate('/cart');
    }
  }, [items, navigate, step, refreshing]);

  const applySavedAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === 'new') {
      setAddress((prev) => ({
        ...prev,
        email: user?.email || prev.email,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zip: '',
        country: 'GE',
      }));
      return;
    }
    const def = savedAddresses.find((a) => a.id === id);
    if (!def) return;
    setAddress({
      email: user?.email || def.email,
      firstName: def.firstName,
      lastName: def.lastName,
      phone: def.phone || '',
      address1: def.address1,
      address2: def.address2 || '',
      city: def.city,
      state: def.state,
      zip: def.zip,
      country: def.country || 'GE',
    });
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthenticated && user && saveAddress && selectedAddressId === 'new') {
      try {
        await AddressService.addAddress(user.id, { ...address, email: user.email }, savedAddresses.length === 0);
      } catch {
        // Non-blocking — still continue to payment.
      }
    }
    setStep('payment');
    window.scrollTo(0, 0);
  };

  // Create or reuse a pending order, mint Flitt token, mount widget.
  useEffect(() => {
    if (step !== 'payment' || items.length === 0 || refreshing) return;
    if (mountedTokenRef.current) return;

    let cancelled = false;
    const fingerprint = cartCheckoutFingerprint(items, address);

    const boot = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const reuseOrderId = PaymentService.getReusablePendingOrderId(fingerprint);
        const orderNumber = `LK${Date.now().toString().slice(-8)}`;
        const newOrder: Order = {
          id: crypto.randomUUID(),
          orderNumber,
          customerName: `${address.firstName} ${address.lastName}`.trim(),
          shippingAddress: address,
          items,
          paymentStatus: 'pending',
          status: 'Processing',
          subtotal,
          shipping,
          tax,
          total,
          createdAt: new Date().toISOString().split('T')[0],
          flittOrderId: orderNumber,
        };

        await PaymentService.loadFlittAssets();
        const tokenResult = await PaymentService.startCheckout(newOrder, i18n.language, {
          reuseOrderId,
          bootKey: fingerprint,
        });
        if (cancelled) return;

        setPendingOrderId(tokenResult.orderId);
        if (typeof tokenResult.total === 'number') {
          setChargedTotal(tokenResult.total);
        }
        if (!tokenResult.publicToken) {
          throw new Error('Missing order access token');
        }
        PaymentService.rememberPendingCheckout(
          tokenResult.orderId,
          fingerprint,
          tokenResult.publicToken,
        );

        await new Promise((r) => requestAnimationFrame(() => r(null)));
        if (!flittRootRef.current || cancelled) return;

        flittRootRef.current.innerHTML = '';
        PaymentService.mountCheckout(
          '#flitt-checkout',
          tokenResult.token,
          {
            storeName: settings.storeName,
            siteUrl: settings.siteUrl,
          },
          {
            onSuccess: () => {
              navigate(`/order-confirmation?order=${tokenResult.orderId}`);
            },
            onError: () => {
              navigate(`/order-confirmation?order=${tokenResult.orderId}`);
            },
          },
        );
        mountedTokenRef.current = tokenResult.token;
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Could not start payment');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    boot();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, refreshing]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <SEO title={t('common.checkout')} noindex />

      <div className="bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="font-heading font-bold text-2xl tracking-tight text-brand-dark">
            {wmBefore}<span className="text-brand-green">{wmAccent}</span>{' '}
            <span className="text-gray-400 text-lg font-sans font-normal ml-2">{t('common.checkout')}</span>
          </div>
          <div className="flex items-center text-sm font-medium text-gray-500">
            <Lock className="w-4 h-4 mr-1" /> {t('checkout.secure')}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3">
            <div className="flex items-center mb-8">
              <div className={`flex items-center ${step === 'shipping' ? 'text-brand-green' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'shipping' ? 'border-brand-green font-bold' : 'border-gray-300'}`}>1</div>
                <span className="ml-2 font-medium">{t('checkout.shipping')}</span>
              </div>
              <div className="w-12 h-px bg-gray-300 mx-4"></div>
              <div className={`flex items-center ${step === 'payment' ? 'text-brand-green' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'payment' ? 'border-brand-green font-bold' : 'border-gray-300'}`}>2</div>
                <span className="ml-2 font-medium">{t('checkout.payment')}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
                {error}
                {step === 'payment' && (
                  <button
                    type="button"
                    className="ml-3 underline font-medium"
                    onClick={() => {
                      mountedTokenRef.current = null;
                      PaymentService.clearPendingCheckout();
                      setPendingOrderId(null);
                      setChargedTotal(null);
                      setError(null);
                      setStep('shipping');
                      setTimeout(() => setStep('payment'), 0);
                    }}
                  >
                    {t('checkout.retry')}
                  </button>
                )}
              </div>
            )}

            {step === 'shipping' && (
              <form onSubmit={handleShippingSubmit} className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
                <h2 className="text-xl font-heading font-bold mb-6">{t('checkout.contact')}</h2>

                {refreshing && (
                  <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t('checkout.updatingPrices')}
                  </p>
                )}

                <div className="space-y-4">
                  {isAuthenticated && savedAddresses.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.selectSavedAddress')}</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={selectedAddressId}
                        onChange={(e) => applySavedAddress(e.target.value)}
                      >
                        {savedAddresses.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.firstName} {a.lastName} — {a.address1}{a.isDefault ? ` (${t('account.default')})` : ''}
                          </option>
                        ))}
                        <option value="new">{t('checkout.useNewAddress')}</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.email')}</label>
                    <input
                      type="email" required
                      readOnly={isAuthenticated}
                      className={`w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none ${isAuthenticated ? 'bg-gray-50 text-gray-600' : ''}`}
                      value={address.email}
                      onChange={(e) => setAddress({ ...address, email: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.firstName')}</label>
                      <input
                        type="text" required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={address.firstName}
                        onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.lastName')}</label>
                      <input
                        type="text" required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={address.lastName}
                        onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.phone')}</label>
                    <input
                      type="tel" required
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.address')}</label>
                    <input
                      type="text" required
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                      value={address.address1}
                      onChange={(e) => setAddress({ ...address, address1: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.apt')}</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                      value={address.address2}
                      onChange={(e) => setAddress({ ...address, address2: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.zip')}</label>
                      <input
                        type="text" required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={address.zip}
                        onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.city')}</label>
                      <input
                        type="text" required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkout.state')}</label>
                      <input
                        type="text" required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-green outline-none"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {isAuthenticated && selectedAddressId === 'new' && (
                  <label className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                    />
                    {t('checkout.saveAddress')}
                  </label>
                )}

                <div className="mt-8 flex justify-end">
                  <Button type="submit" size="lg" disabled={refreshing || items.length === 0}>
                    {t('checkout.continueToPayment')}
                  </Button>
                </div>
              </form>
            )}

            {step === 'payment' && (
              <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
                <h2 className="text-xl font-heading font-bold mb-2 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-green" />
                  {t('checkout.paymentMethod')}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {t('checkout.pay')} {fmt(displayTotal)} · {settings.currency || 'GEL'}
                </p>

                {isLoading && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
                    <p className="text-sm">{t('checkout.preparing')}</p>
                  </div>
                )}

                <div
                  id="flitt-checkout"
                  ref={flittRootRef}
                  className={isLoading ? 'hidden' : 'min-h-[320px]'}
                />

                <div className="mt-6 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => {
                      mountedTokenRef.current = null;
                      setChargedTotal(null);
                      setStep('shipping');
                    }}
                    className="text-gray-500 hover:text-gray-900 font-medium"
                  >
                    {t('checkout.backToShipping')}
                  </button>
                  {pendingOrderId && (
                    <button
                      type="button"
                      className="text-sm text-gray-400 hover:text-brand-dark"
                      onClick={() => navigate(`/order-confirmation?order=${pendingOrderId}`)}
                    >
                      {t('checkout.alreadyPaid')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="lg:w-1/3">
            <OrderSummary
              items={items}
              subtotal={subtotal}
              shipping={shipping}
              tax={tax}
              total={displayTotal}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

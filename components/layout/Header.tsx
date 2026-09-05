
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, X, LogOut, ChevronRight, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../store/cart-store';
import { useAuthStore } from '../../store/auth-store';
import { AuthService } from '../../services/auth-service';
import { SearchOverlay } from '../search/SearchOverlay';
import { useSettingsStore, LANGUAGE_CHOSEN_KEY } from '../../store/settings-store';
import { useCategories } from '../../lib/use-categories';
import { categoryLabel } from '../../lib/taxonomy';
import { splitWordmark } from '../../lib/wordmark';
import { useFormatPrice } from '../../lib/format';

export const Header = () => {
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const categories = useCategories();

  const { toggleCart, getTotalItems } = useCartStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const freeShippingThreshold = useSettingsStore((s) => s.settings.freeShippingThreshold);
  const storeName = useSettingsStore((s) => s.settings.storeName);
  const [wordmarkHead, wordmarkTail] = splitWordmark(storeName);
  const fmt = useFormatPrice();
  const navigate = useNavigate();
  const cartCount = getTotalItems();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOverlayOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleLanguage = () => {
    const current = i18n.resolvedLanguage || i18n.language;
    try {
      localStorage.setItem(LANGUAGE_CHOSEN_KEY, '1');
    } catch {
      /* storage unavailable: the admin default simply keeps applying */
    }
    i18n.changeLanguage(current === 'ka' ? 'en' : 'ka');
  };

  const handleLogout = async () => {
    await AuthService.logout();
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const closeMobile = () => setIsMobileMenuOpen(false);
  const accountLink = user?.role === 'admin' ? '/admin' : '/account';
  const accountLabel = user?.role === 'admin' ? t('common.admin') : t('common.myAccount');
  // Every category gets a slot: five fit at lg, the rest join at xl so a
  // category as large as Hair is never simply missing from the desktop nav.
  const displayCategories = categories;
  const currentLang = i18n.resolvedLanguage || i18n.language;

  return (
    <>
      <SearchOverlay isOpen={isSearchOverlayOpen} onClose={() => setIsSearchOverlayOpen(false)} />
      <div className="bg-brand-dark text-white text-[11px] uppercase tracking-widest py-2.5 px-4 text-center sm:text-left relative z-50">
        <div className="container mx-auto flex justify-between items-center">
          {/* Only a real threshold is worth announcing; with none set the bar carries just the links. */}
          {freeShippingThreshold > 0 && (
            <>
              <p className="font-medium hidden sm:block opacity-90">
                {t('common.freeShipping', { amount: fmt(freeShippingThreshold) })}
              </p>
              <p className="font-medium sm:hidden opacity-90">
                {t('product.freeShippingBadge', { amount: fmt(freeShippingThreshold) })}
              </p>
            </>
          )}
          <div className="flex items-center gap-6 ml-auto">
            <button type="button" onClick={toggleLanguage} className="flex items-center gap-1 hover:text-brand-green transition-colors font-bold cursor-pointer">
              <Globe className="w-3 h-3" /> {currentLang === 'ka' ? 'EN' : 'KA'}
            </button>
            <div className="hidden sm:flex gap-6">
              <Link to="/track-order" className="hover:text-brand-green transition-colors opacity-80 hover:opacity-100">{t('checkout.trackOrder')}</Link>
              <Link to="/help" className="hover:text-brand-green transition-colors opacity-80 hover:opacity-100">{t('account.helpFaqs')}</Link>
            </div>
          </div>
        </div>
      </div>
      <header className={`sticky top-0 z-40 transition-all duration-500 border-b border-transparent ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-gray-100 py-3' : 'bg-white py-5'}`}>
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center justify-between h-10">
            <div className="flex items-center gap-4 relative z-20">
              <button type="button" className="lg:hidden p-2 -ml-2 text-gray-800 hover:text-brand-green transition-colors focus:outline-none" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-6 h-6" />
              </button>
              <Link to="/" className="flex items-center group">
                <span className="font-heading font-bold text-2xl md:text-3xl tracking-tighter text-brand-dark">{wordmarkHead}<span className="text-brand-green">{wordmarkTail}</span>.</span>
              </Link>
            </div>
            <div className="flex items-center justify-end flex-1 ml-4 lg:ml-12 relative">
              <nav className="hidden lg:flex items-center gap-8 xl:gap-10 absolute left-0">
                <Link to="/products" className="text-[13px] uppercase tracking-wider font-semibold text-gray-800 hover:text-brand-green transition-colors relative group py-2">
                  {t('common.shopAll')}
                  <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-brand-green transition-all duration-300 group-hover:w-full" />
                </Link>
                {displayCategories.map((cat, index) => (
                  <Link key={cat.slug} to={`/category/${cat.slug}`} className={`${index >= 5 ? 'hidden xl:inline-flex' : ''} text-[13px] uppercase tracking-wider font-semibold text-gray-800 hover:text-brand-green transition-colors relative group py-2`}>
                    {categoryLabel(cat, i18n.language)}
                    <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-brand-green transition-all duration-300 group-hover:w-full" />
                  </Link>
                ))}
                <Link to="/sale" className="text-[13px] uppercase tracking-wider font-semibold text-red-500 hover:text-red-600 transition-colors">{t('common.sale')}</Link>
              </nav>
              <div className="flex items-center gap-1 md:gap-3 ml-auto relative z-30 pl-2">
                <button type="button" onClick={() => setIsSearchOverlayOpen(true)} className="p-2 rounded-full text-gray-800 hover:text-brand-green transition-colors"><Search className="w-5 h-5" /></button>
                <div className="h-4 w-px bg-gray-200 hidden md:block" />
                <div className="flex items-center gap-1 md:gap-3">
                  <Link to="/wishlist" className="p-2 text-gray-800 hover:text-brand-green transition-colors" title={t('common.wishlist')}><Heart className="w-5 h-5" /></Link>
                  {isAuthenticated
                    ? <Link to={accountLink} className="p-2 text-gray-800 hover:text-brand-green transition-colors" title={accountLabel}><User className="w-5 h-5" /></Link>
                    : <Link to="/login" className="p-2 text-gray-800 hover:text-brand-green transition-colors"><User className="w-5 h-5" /></Link>}
                  {isAuthenticated && (
                    <button type="button" onClick={handleLogout} className="hidden lg:block p-2 text-gray-800 hover:text-red-500 transition-colors" title={t('common.logOut')}>
                      <LogOut className="w-5 h-5" />
                    </button>
                  )}
                  <button type="button" onClick={toggleCart} className="p-2 text-gray-800 hover:text-brand-green transition-colors relative group">
                    <ShoppingCart className="w-5 h-5" />
                    {cartCount > 0 && <span className="absolute top-1 right-0.5 bg-brand-green text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">{cartCount}</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className={`fixed inset-0 z-[60] lg:hidden transition-all duration-500 ${isMobileMenuOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`} onClick={closeMobile} />
        <div className="absolute top-0 left-0 w-[85%] max-w-sm h-full bg-white shadow-2xl flex flex-col transition-transform duration-500" style={{ transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)' }}>
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <span className="font-heading font-bold text-xl text-brand-dark">{t('common.menu')}</span>
            <button type="button" onClick={closeMobile} className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <nav className="flex flex-col gap-2">
              <Link to="/products" className="flex items-center justify-between text-lg font-medium text-gray-800 py-4 border-b border-gray-50" onClick={closeMobile}>{t('common.shopAll')}<ChevronRight className="w-5 h-5 text-gray-300" /></Link>
              <Link to="/sale" className="flex items-center justify-between text-lg font-medium text-red-500 py-4 border-b border-gray-50" onClick={closeMobile}>{t('common.sale')}<ChevronRight className="w-5 h-5 text-gray-300" /></Link>
              {categories.map((cat) => (
                <Link key={cat.slug} to={`/category/${cat.slug}`} className="flex items-center justify-between text-lg font-medium text-gray-800 py-4 border-b border-gray-50" onClick={closeMobile}>
                  {categoryLabel(cat, i18n.language)}
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </Link>
              ))}
              <Link to="/wishlist" className="flex items-center justify-between text-lg font-medium text-gray-800 py-4 border-b border-gray-50" onClick={closeMobile}>{t('common.wishlist')}<ChevronRight className="w-5 h-5 text-gray-300" /></Link>
              <Link to="/track-order" className="flex items-center justify-between text-lg font-medium text-gray-800 py-4 border-b border-gray-50" onClick={closeMobile}>{t('checkout.trackOrder')}<ChevronRight className="w-5 h-5 text-gray-300" /></Link>
              <Link to="/help" className="flex items-center justify-between text-lg font-medium text-gray-800 py-4 border-b border-gray-50" onClick={closeMobile}>{t('account.helpFaqs')}<ChevronRight className="w-5 h-5 text-gray-300" /></Link>
              {isAuthenticated ? (
                <>
                  <Link to={accountLink} className="flex items-center justify-between text-lg font-medium text-gray-800 py-4 border-b border-gray-50" onClick={closeMobile}>{accountLabel}<ChevronRight className="w-5 h-5 text-gray-300" /></Link>
                  <button type="button" onClick={handleLogout} className="flex items-center justify-between text-lg font-medium text-red-500 py-4 border-b border-gray-50 w-full text-left">
                    {t('common.logOut')}<LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <Link to="/login" className="flex items-center justify-between text-lg font-medium text-gray-800 py-4 border-b border-gray-50" onClick={closeMobile}>{t('auth.signIn')}<ChevronRight className="w-5 h-5 text-gray-300" /></Link>
              )}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

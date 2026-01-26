
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, X, LogOut, ChevronRight, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../store/cart-store';
import { useAuthStore } from '../../store/auth-store';
import { AuthService } from '../../services/auth-service';
import { CategoryService } from '../../services/category-service';
import { CategoryHierarchyItem } from '../../types';
import { SearchOverlay } from '../search/SearchOverlay';

export const Header = () => {
  const { t, i18n } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Search States
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  
  const [categories, setCategories] = useState<CategoryHierarchyItem[]>([]);
  
  const { toggleCart, getTotalItems } = useCartStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const cartCount = getTotalItems();

  useEffect(() => {
    CategoryService.getCategories().then(setCategories);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcut for search overlay
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
    // If currently Georgian, switch to English. Otherwise (English, US, etc) switch to Georgian.
    const newLang = current === 'ka' ? 'en' : 'ka';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
      await AuthService.logout();
      logout();
      navigate('/');
      setIsMobileMenuOpen(false);
  };

  const accountLink = user?.role === 'admin' ? '/admin' : '/account';
  const accountLabel = user?.role === 'admin' ? t('common.admin') : t('common.myAccount');
  const displayCategories = categories.slice(0, 5);
  const currentLang = i18n.resolvedLanguage || i18n.language;

  return (
    <>
      <SearchOverlay isOpen={isSearchOverlayOpen} onClose={() => setIsSearchOverlayOpen(false)} />

      {/* Top Bar */}
      <div className="bg-brand-dark text-white text-[11px] uppercase tracking-widest py-2.5 px-4 text-center sm:text-left relative z-50">
        <div className="container mx-auto flex justify-between items-center">
          <p className="font-medium hidden sm:block opacity-90">{t('common.freeShipping')}</p>
          <p className="font-medium sm:hidden opacity-90">{t('product.freeShippingBadge')}</p>
          <div className="flex items-center gap-6">
             <button 
                onClick={toggleLanguage}
                className="flex items-center gap-1 hover:text-brand-green transition-colors font-bold cursor-pointer"
             >
                <Globe className="w-3 h-3" />
                {currentLang === 'ka' ? 'EN' : 'KA'}
             </button>
             <div className="hidden sm:flex gap-6">
                <Link to="/account" className="hover:text-brand-green transition-colors opacity-80 hover:opacity-100">Track Order</Link>
                <Link to="/help" className="hover:text-brand-green transition-colors opacity-80 hover:opacity-100">Help & FAQs</Link>
             </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={`sticky top-0 z-40 transition-all duration-500 border-b border-transparent ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-gray-100 py-3' 
            : 'bg-white py-5'
        }`}
      >
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center justify-between h-10">
            
            {/* Left: Mobile Menu & Logo */}
            <div className="flex items-center gap-4 relative z-20">
              <button
                className="lg:hidden p-2 -ml-2 text-gray-800 hover:text-brand-green transition-colors focus:outline-none"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open Menu"
              >
                <Menu className="w-6 h-6" />
              </button>

              <Link to="/" className="flex items-center group">
                <span className="font-heading font-bold text-2xl md:text-3xl tracking-tighter text-brand-dark">
                  Lesi<span className="text-brand-green">Ko</span>.
                </span>
              </Link>
            </div>

            {/* Center & Right Container */}
            <div className="flex items-center justify-end flex-1 ml-4 lg:ml-12 relative">
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-8 xl:gap-10 absolute left-0">
                <Link
                    to="/products"
                    className="text-[13px] uppercase tracking-wider font-semibold text-gray-800 hover:text-brand-green transition-colors relative group py-2"
                >
                    {t('common.shopAll')}
                    <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-brand-green transition-all duration-300 group-hover:w-full ease-[cubic-bezier(0.4,0,0.2,1)]" />
                </Link>
                {displayCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    to={`/category/${cat.slug}`}
                    className="text-[13px] uppercase tracking-wider font-semibold text-gray-800 hover:text-brand-green transition-colors relative group py-2"
                  >
                    {t(`categories.${cat.slug}`, cat.label)}
                    <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-brand-green transition-all duration-300 group-hover:w-full ease-[cubic-bezier(0.4,0,0.2,1)]" />
                  </Link>
                ))}
                <Link to="/sale" className="text-[13px] uppercase tracking-wider font-semibold text-red-500 hover:text-red-600 transition-colors">
                  {t('common.sale')}
                </Link>
              </nav>

              {/* Action Icons Area */}
              <div className="flex items-center gap-1 md:gap-3 ml-auto relative z-30 pl-2">
                
                {/* Search Trigger */}
                <button 
                  type="button"
                  onClick={() => setIsSearchOverlayOpen(true)}
                  className="p-2 rounded-full text-gray-800 hover:text-brand-green hover:bg-gray-50 transition-colors group"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>
                
                <div className="h-4 w-px bg-gray-200 hidden md:block"></div>

                <div className="flex items-center gap-1 md:gap-3">
                    <Link to="/wishlist" className="hidden md:block p-2 text-gray-800 hover:text-brand-green transition-colors rounded-full hover:bg-gray-50">
                      <Heart className="w-5 h-5" />
                    </Link>

                    {isAuthenticated ? (
                        <Link to={accountLink} className="p-2 text-gray-800 hover:text-brand-green transition-colors rounded-full hover:bg-gray-50" title={accountLabel}>
                          <User className="w-5 h-5" />
                        </Link>
                    ) : (
                        <Link to="/login" className="p-2 text-gray-800 hover:text-brand-green transition-colors rounded-full hover:bg-gray-50">
                          <User className="w-5 h-5" />
                        </Link>
                    )}

                    <button 
                      onClick={toggleCart}
                      className="p-2 text-gray-800 hover:text-brand-green transition-colors relative rounded-full hover:bg-gray-50 group"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {cartCount > 0 && (
                        <span className="absolute top-1 right-0.5 bg-brand-green text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white group-hover:scale-110 transition-transform">
                          {cartCount}
                        </span>
                      )}
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <div 
        className={`fixed inset-0 z-[60] lg:hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isMobileMenuOpen ? 'visible' : 'invisible'}`}
      >
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Drawer */}
        <div 
          className="absolute top-0 left-0 w-[85%] max-w-sm h-full bg-white shadow-2xl flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]" 
          style={{ 
            transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)'
          }}
        >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="font-heading font-bold text-xl tracking-tight text-brand-dark">Menu</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 bg-white border border-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <nav className="flex flex-col gap-2">
                <Link
                    to="/products"
                    className="flex items-center justify-between text-lg font-medium text-gray-800 py-4 border-b border-gray-50 group animate-fade-in-up"
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    {t('common.shopAll')}
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-green group-hover:translate-x-1 transition-all" />
                </Link>
                {categories.map((cat, idx) => (
                  <Link
                    key={cat.slug}
                    to={`/category/${cat.slug}`}
                    className="flex items-center justify-between text-lg font-medium text-gray-800 py-4 border-b border-gray-50 group animate-fade-in-up"
                    style={{ animationDelay: `${(idx + 1) * 50}ms` }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t(`categories.${cat.slug}`, cat.label)}
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-green group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
                <Link
                  to="/sale"
                  className="flex items-center justify-between text-lg font-bold text-red-500 py-4 border-b border-gray-50 animate-fade-in-up"
                  style={{ animationDelay: '300ms' }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('common.sale')}
                  <ChevronRight className="w-5 h-5 text-red-200" />
                </Link>
              </nav>

              <div className="mt-8 space-y-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
                 <Link 
                  to="/wishlist" 
                  className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg text-gray-600 font-medium hover:text-brand-green hover:bg-brand-green/5 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                 >
                   <Heart className="w-5 h-5" /> {t('common.wishlist')}
                 </Link>
                 
                 {isAuthenticated ? (
                   <>
                      <Link 
                        to={accountLink} 
                        className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg text-gray-600 font-medium hover:text-brand-green hover:bg-brand-green/5 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                         <User className="w-5 h-5" /> {accountLabel}
                      </Link>
                      <button 
                        onClick={handleLogout} 
                        className="flex items-center gap-3 px-4 py-3 w-full text-left bg-red-50 rounded-lg text-red-500 font-medium hover:bg-red-100 transition-colors"
                      >
                          <LogOut className="w-5 h-5" /> {t('common.logOut')}
                      </button>
                   </>
                 ) : (
                   <Link 
                    to="/login" 
                    className="flex items-center gap-3 px-4 py-3 bg-brand-dark rounded-lg text-white font-medium hover:bg-gray-800 transition-colors justify-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                   >
                      <User className="w-5 h-5" /> {t('common.logIn')}
                   </Link>
                 )}
              </div>
            </div>

            {/* Mobile Language Switcher Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
               <button 
                  onClick={() => {
                    toggleLanguage();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-200 bg-white font-bold text-gray-800 hover:bg-gray-50 active:scale-[0.98] transition-all"
               >
                  <Globe className="w-4 h-4 text-brand-green" />
                  <span className="flex-1 text-left">
                      {currentLang === 'ka' ? 'ენა: ქართული' : 'Language: English'}
                  </span>
                  <span className="text-brand-green text-xs font-bold uppercase border border-brand-green/30 px-2 py-0.5 rounded">
                      {currentLang === 'ka' ? 'Switch to EN' : 'Switch to KA'}
                  </span>
               </button>
            </div>
        </div>
      </div>
    </>
  );
};

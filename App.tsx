
import React, { useEffect, Suspense, ReactNode, Component, lazy, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';

// Layout & Components. These render on every storefront route, so they belong
// in the entry chunk.
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { QuickViewModal } from './components/product/QuickViewModal';
import { Toaster } from './components/ui/Toaster';
import { useSettingsStore } from './store/settings-store';
import { AuthBootstrap } from './components/auth/AuthBootstrap';

// The three routes a shopper actually lands on stay in the entry chunk;
// splitting them would only add a round trip to the first paint.
import { HomePage } from './pages/HomePage';
import { ProductListingPage } from './pages/ProductListingPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { trackPageView } from './lib/analytics';
import { reportError } from './lib/error-reporting';
import { dismissSplash } from './lib/splash';
import { recallScroll, rememberScroll, restoreScrollWhenReady } from './lib/scroll-memory';

/**
 * Everything below is loaded on demand.
 *
 * The whole application used to build as one 439 KB chunk, which meant every
 * shopper downloaded the entire admin panel — nine pages of forms and editors
 * behind a role check they will never pass — before the homepage could render.
 * Checkout, the account area and the auth pages are the same story: real code,
 * but not on the path to a first paint.
 */
/**
 * A tab opened before a deploy still asks for the old chunk names, which no
 * longer exist ("Failed to fetch dynamically imported module"). One reload
 * fetches the new index and the new names; the flag stops a reload loop if
 * the failure is something else.
 */
const RELOAD_FLAG = 'lesiko-chunk-reload';
const lazyPage = <T,>(loader: () => Promise<T>, pick: (m: T) => React.ComponentType<any>) =>
  lazy(() =>
    loader()
      .then(m => {
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ }
        return { default: pick(m) };
      })
      .catch(err => {
        let reloaded = false;
        try {
          reloaded = sessionStorage.getItem(RELOAD_FLAG) === '1';
          if (!reloaded) sessionStorage.setItem(RELOAD_FLAG, '1');
        } catch { /* ignore */ }
        if (!reloaded && /import|module|chunk/i.test(String(err?.message || err))) {
          window.location.reload();
          return new Promise<{ default: React.ComponentType<any> }>(() => undefined);
        }
        throw err;
      }),
  );

const AdminLayout = lazyPage(() => import('./components/admin/AdminLayout'), m => m.AdminLayout);
const AdminDashboard = lazyPage(() => import('./pages/admin/AdminDashboard'), m => m.AdminDashboard);
const AdminProducts = lazyPage(() => import('./pages/admin/AdminProducts'), m => m.AdminProducts);
const AdminOrders = lazyPage(() => import('./pages/admin/AdminOrders'), m => m.AdminOrders);
const AdminCustomers = lazyPage(() => import('./pages/admin/AdminCustomers'), m => m.AdminCustomers);
const AdminSettings = lazyPage(() => import('./pages/admin/AdminSettings'), m => m.AdminSettings);
const AdminCategories = lazyPage(() => import('./pages/admin/AdminCategories'), m => m.AdminCategories);
const AdminBrands = lazyPage(() => import('./pages/admin/AdminBrands'), m => m.AdminBrands);
const AdminContent = lazyPage(() => import('./pages/admin/AdminContent'), m => m.AdminContent);
const AdminSEO = lazyPage(() => import('./pages/admin/AdminSEO'), m => m.AdminSEO);

const BrandIndexPage = lazyPage(() => import('./pages/BrandIndexPage'), m => m.BrandIndexPage);
const WishlistPage = lazyPage(() => import('./pages/WishlistPage'), m => m.WishlistPage);
const CartPage = lazyPage(() => import('./pages/CartPage'), m => m.CartPage);
const CheckoutPage = lazyPage(() => import('./pages/CheckoutPage'), m => m.CheckoutPage);
const OrderConfirmationPage = lazyPage(() => import('./pages/OrderConfirmationPage'), m => m.OrderConfirmationPage);
const LoginPage = lazyPage(() => import('./pages/LoginPage'), m => m.LoginPage);
const RegisterPage = lazyPage(() => import('./pages/RegisterPage'), m => m.RegisterPage);
const ForgotPasswordPage = lazyPage(() => import('./pages/ForgotPasswordPage'), m => m.ForgotPasswordPage);
const ResetPasswordPage = lazyPage(() => import('./pages/ResetPasswordPage'), m => m.ResetPasswordPage);
const AccountPage = lazyPage(() => import('./pages/AccountPage'), m => m.AccountPage);
const AccountOrderDetailPage = lazyPage(() => import('./pages/AccountOrderDetailPage'), m => m.AccountOrderDetailPage);
const TrackOrderPage = lazyPage(() => import('./pages/TrackOrderPage'), m => m.TrackOrderPage);
const HelpPage = lazyPage(() => import('./pages/HelpPage'), m => m.HelpPage);
const NotFoundPage = lazyPage(() => import('./pages/NotFoundPage'), m => m.NotFoundPage);
const LegalPage = lazyPage(() => import('./pages/LegalPage'), m => m.LegalPage);

/** Shown while a route chunk arrives. Matches the spinner the app already uses. */
const RouteFallback = () => (
  <div className="flex items-center justify-center py-32">
    <div className="animate-spin h-8 w-8 border-4 border-brand-green border-t-transparent rounded-full" />
  </div>
);

/**
 * Lifts the boot splash once a route has actually mounted. Rendered inside the
 * Suspense boundary, so while a lazy chunk is still arriving the splash stays
 * up instead of giving way to the spinner. The homepage is the exception: it
 * lifts the splash itself once its hero image has decoded (lib/hero.ts).
 */
const SplashGate = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname !== '/') dismissSplash();
  }, [pathname]);
  return null;
};

/**
 * A new page starts at the top; back and forward go back to where you were.
 * The browser's own restoration cannot do the second half for a page whose
 * content arrives after the navigation, so this remembers the offset per
 * history entry and restores it once the page is tall enough (lib/scroll-memory).
 */
const ScrollToTop = () => {
  const { pathname, search, key } = useLocation();
  const navigationType = useNavigationType();
  const firstView = useRef(true);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  }, []);

  useEffect(() => {
    if (navigationType === 'POP') {
      const y = recallScroll(key);
      if (y) restoreScrollWhenReady(y);
    } else {
      window.scrollTo(0, 0);
    }
    // Only the path decides this: changing a filter rewrites the query string
    // and must not throw the shopper back to the top of the listing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    let timer: number | undefined;
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => rememberScroll(key), 150);
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', save);
      rememberScroll(key);
    };
  }, [key]);

  useEffect(() => {
    // The first view is reported by initAnalytics once the measurement ID is
    // known; this covers every navigation after it.
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    trackPageView(pathname + search);
  }, [pathname, search]);
  return null;
};

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Fix: extend Component directly to ensure props and state are correctly recognized by the compiler
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Use property initializer instead of constructor to avoid potential typing issues in some environments
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    dismissSplash();
    reportError(error, info.componentStack || '');
  }

  render() {
    // Destructure state and props to improve type recognition and satisfy the compiler
    const { hasError } = this.state;
    const { children } = this.props;

    // Correctly accessing state and props from React.Component base class
    if (hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
          <h1 className="text-2xl font-bold mb-2">Something went wrong.</h1>
          <p className="text-gray-600 mb-4">The application encountered an unexpected error.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-brand-green text-white rounded-full">Reload Page</button>
        </div>
      );
    }
    return children;
  }
}

const App = () => {
  const loadSettings = useSettingsStore(s => s.loadSettings);

  // Tax rate and free-shipping threshold live in site_content, so the cart and
  // checkout need them before the first total is rendered.
  useEffect(() => { loadSettings(); }, [loadSettings]);

  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <AuthBootstrap />
        <div className="flex flex-col min-h-screen">
          <Toaster />
          
          <Suspense fallback={<div className="h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-brand-green border-t-transparent rounded-full" /></div>}>
            <SplashGate />
            <Routes>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="brands" element={<AdminBrands />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="customers" element={<AdminCustomers />} />
                    <Route path="content" element={<AdminContent />} />
                    <Route path="seo" element={<AdminSEO />} />
                    <Route path="settings" element={<AdminSettings />} />
                </Route>

                <Route path="*" element={
                    <>
                        <Header />
                        <CartDrawer />
                        <QuickViewModal />
                        <main className="flex-grow">
                          <Suspense fallback={<RouteFallback />}>
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/products" element={<ProductListingPage />} />
                                <Route path="/category/:slug" element={<ProductListingPage />} />
                                <Route path="/brand/:slug" element={<ProductListingPage />} />
                                <Route path="/brands" element={<BrandIndexPage />} />
                                <Route path="/product/:slug" element={<ProductDetailPage />} />
                                <Route path="/sale" element={<ProductListingPage />} />
                                <Route path="/wishlist" element={<WishlistPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                <Route path="/reset-password" element={<ResetPasswordPage />} />
                                <Route path="/account" element={<AccountPage />} />
                                <Route path="/account/orders" element={<AccountPage />} />
                                <Route path="/account/addresses" element={<AccountPage />} />
                                <Route path="/account/profile" element={<AccountPage />} />
                                <Route path="/account/orders/:orderId" element={<AccountOrderDetailPage />} />
                                <Route path="/track-order" element={<TrackOrderPage />} />
                                <Route path="/help" element={<HelpPage />} />
                                <Route path="/terms" element={<LegalPage pageKey="terms" />} />
                                <Route path="/privacy" element={<LegalPage pageKey="privacy" />} />
                                <Route path="/delivery" element={<LegalPage pageKey="delivery" />} />
                                <Route path="/returns" element={<LegalPage pageKey="returns" />} />
                                <Route path="/cart" element={<CartPage />} />
                                <Route path="/checkout" element={<CheckoutPage />} />
                                <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                          </Suspense>
                        </main>
                        <Footer />
                    </>
                } />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;

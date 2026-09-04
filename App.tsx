
import React, { useEffect, Suspense, ReactNode, Component, lazy, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

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

/**
 * Everything below is loaded on demand.
 *
 * The whole application used to build as one 439 KB chunk, which meant every
 * shopper downloaded the entire admin panel — nine pages of forms and editors
 * behind a role check they will never pass — before the homepage could render.
 * Checkout, the account area and the auth pages are the same story: real code,
 * but not on the path to a first paint.
 */
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts').then(m => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers').then(m => ({ default: m.AdminCustomers })));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings').then(m => ({ default: m.AdminSettings })));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminBrands = lazy(() => import('./pages/admin/AdminBrands').then(m => ({ default: m.AdminBrands })));
const AdminContent = lazy(() => import('./pages/admin/AdminContent').then(m => ({ default: m.AdminContent })));
const AdminSEO = lazy(() => import('./pages/admin/AdminSEO').then(m => ({ default: m.AdminSEO })));

const BrandIndexPage = lazy(() => import('./pages/BrandIndexPage').then(m => ({ default: m.BrandIndexPage })));
const WishlistPage = lazy(() => import('./pages/WishlistPage').then(m => ({ default: m.WishlistPage })));
const CartPage = lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then(m => ({ default: m.AccountPage })));
const AccountOrderDetailPage = lazy(() => import('./pages/AccountOrderDetailPage').then(m => ({ default: m.AccountOrderDetailPage })));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage').then(m => ({ default: m.TrackOrderPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then(m => ({ default: m.HelpPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then(m => ({ default: m.LegalPage })));

/** Shown while a route chunk arrives. Matches the spinner the app already uses. */
const RouteFallback = () => (
  <div className="flex items-center justify-center py-32">
    <div className="animate-spin h-8 w-8 border-4 border-brand-green border-t-transparent rounded-full" />
  </div>
);

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const firstView = useRef(true);
  useEffect(() => {
    window.scrollTo(0, 0);
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

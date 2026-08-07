
import React, { useEffect, Suspense, ReactNode, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Layout & Components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { QuickViewModal } from './components/product/QuickViewModal';
import { Toaster } from './components/ui/Toaster'; 
import { useSettingsStore } from './store/settings-store';

// Admin
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCustomers } from './pages/admin/AdminCustomers';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminBrands } from './pages/admin/AdminBrands';
import { AdminContent } from './pages/admin/AdminContent';
import { AdminSEO } from './pages/admin/AdminSEO';

// Pages
import { HomePage } from './pages/HomePage';
import { ProductListingPage } from './pages/ProductListingPage';
import { BrandIndexPage } from './pages/BrandIndexPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { WishlistPage } from './pages/WishlistPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { HelpPage } from './pages/HelpPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
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
        <div className="flex flex-col min-h-screen">
          <Toaster />
          
          <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
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
                                <Route path="/account" element={<AccountPage />} />
                                <Route path="/account/orders" element={<AccountPage />} />
                                <Route path="/help" element={<HelpPage />} />
                                <Route path="/cart" element={<CartPage />} />
                                <Route path="/checkout" element={<CheckoutPage />} />
                                <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
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

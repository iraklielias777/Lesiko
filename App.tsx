
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Layout & Components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { QuickViewModal } from './components/product/QuickViewModal';
import { Toaster } from './components/ui/Toaster'; 

// Admin
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCustomers } from './pages/admin/AdminCustomers';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminBrands } from './pages/admin/AdminBrands';

// Pages
import { HomePage } from './pages/HomePage';
import { ProductListingPage } from './pages/ProductListingPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { WishlistPage } from './pages/WishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountPage } from './pages/AccountPage';
import { HelpPage } from './pages/HelpPage';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Placeholder for unbuilt pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="min-h-[50vh] flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600">This page is under construction.</p>
    </div>
  </div>
);

const App = () => {
  return (
    <Router>
      <ScrollToTop />
      <div className="flex flex-col min-h-screen">
        <Toaster /> {/* Global Toast Notifications */}
        
        <Routes>
            {/* Admin Routes (No Header/Footer) */}
            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="brands" element={<AdminBrands />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="*" element={<PlaceholderPage title="Admin Section" />} />
            </Route>

            {/* Public/Customer Routes */}
            <Route path="*" element={
                <>
                    <Header />
                    <CartDrawer />
                    <QuickViewModal />
                    <main className="flex-grow">
                        <Routes>
                            <Route path="/" element={<HomePage />} />
                            
                            {/* Catalog Routes */}
                            <Route path="/products" element={<ProductListingPage />} />
                            <Route path="/category/:slug" element={<ProductListingPage />} />
                            <Route path="/product/:slug" element={<ProductDetailPage />} />
                            
                            <Route path="/sale" element={<ProductListingPage />} />
                            <Route path="/wishlist" element={<WishlistPage />} />
                            
                            {/* Auth & Account */}
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                            <Route path="/account" element={<AccountPage />} />
                            
                            {/* Help & Support */}
                            <Route path="/help" element={<HelpPage />} />
                            <Route path="/faq" element={<HelpPage />} />
                            <Route path="/shipping" element={<HelpPage />} />
                            <Route path="/contact" element={<HelpPage />} />
                            
                            {/* Checkout Routes */}
                            <Route path="/checkout" element={<CheckoutPage />} />
                            <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
                            
                            <Route path="*" element={<PlaceholderPage title="404 - Not Found" />} />
                        </Routes>
                    </main>
                    <Footer />
                </>
            } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;

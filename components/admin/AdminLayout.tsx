
import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Home,
  ListFilter,
  Tag,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import { AuthService } from '../../services/auth-service';
import { useTranslation } from 'react-i18next';

export const AdminLayout = () => {
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login, logout } = useAuthStore();

  useEffect(() => {
    const verifyAdmin = async () => {
      // 1. If we already have an admin user in state, we're good
      if (user?.role === 'admin') {
        setIsChecking(false);
        return;
      }

      // 2. If we have a user but they aren't an admin, kick them out
      if (user && user.role !== 'admin') {
        navigate('/', { replace: true });
        return;
      }

      // 3. If no user in state (e.g. page refresh), check Supabase directly
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser && currentUser.role === 'admin') {
          login(currentUser); // Update store if we found them
          setIsChecking(false);
        } else {
          // Not an admin or not logged in
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error("Admin verification failed:", error);
        navigate('/login', { replace: true });
      }
    };

    verifyAdmin();
  }, [user, navigate, login]);

  const handleLogout = () => {
      logout();
      navigate('/login', { replace: true });
  };

  const navItems = [
    { icon: LayoutDashboard, label: t('admin.dashboard'), path: '/admin' },
    { icon: Package, label: t('admin.products'), path: '/admin/products' },
    { icon: ListFilter, label: t('admin.categories'), path: '/admin/categories' },
    { icon: Tag, label: t('admin.brands'), path: '/admin/brands' },
    { icon: ShoppingBag, label: t('admin.orders'), path: '/admin/orders' },
    { icon: Users, label: t('admin.customers'), path: '/admin/customers' },
    { icon: Settings, label: t('admin.settings'), path: '/admin/settings' },
  ];

  // Show loading while verifying role
  if (isChecking) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-brand-green animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Verifying Admin Access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-brand-dark text-white z-50 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
           <span className="font-heading font-bold text-2xl tracking-tight">
             Lesi<span className="text-brand-green">Ko</span>
             <span className="text-xs ml-2 bg-brand-green text-brand-dark px-1.5 py-0.5 rounded font-bold">ADMIN</span>
           </span>
           <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400">
             <X className="w-5 h-5" />
           </button>
        </div>

        <nav className="p-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-brand-green text-brand-dark font-medium' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-800">
           <Link to="/" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors mb-2">
              <Home className="w-5 h-5" /> {t('admin.viewStore')}
           </Link>
           <button 
             onClick={handleLogout}
             className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-lg transition-colors w-full"
           >
              <LogOut className="w-5 h-5" /> {t('common.logOut')}
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full lg:ml-0">
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between lg:hidden">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600">
                <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-gray-900">{t('common.admin')}</span>
            <div className="w-8"></div>
        </div>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};


import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth-service';
import { useAuthStore } from '../store/auth-store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';
import { usePageSeo } from '../lib/use-seo';

// ---------------------------------------------------------------------------
// REMOVE BEFORE PUBLIC LAUNCH
// Test credentials shown on the sign-in page so the admin panel can be reached
// without asking for them. Delete this block and the <AdminTestCredentials />
// usage below the sign-in form.
// ---------------------------------------------------------------------------
const ADMIN_TEST_EMAIL = 'admin@lesiko.com';
const ADMIN_TEST_PASSWORD = '9L1z71cmUOsD39Wu5tLoAa1!';

const AdminTestCredentials = ({ onUse }: { onUse: () => void }) => (
  <div className="mt-8 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-4">
    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-2">
      Test admin — remove before launch
    </p>
    <dl className="text-xs text-amber-900 space-y-1 font-mono">
      <div className="flex gap-2">
        <dt className="text-amber-600">email</dt>
        <dd>{ADMIN_TEST_EMAIL}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-amber-600">pass</dt>
        <dd>{ADMIN_TEST_PASSWORD}</dd>
      </div>
    </dl>
    <button
      type="button"
      onClick={onUse}
      className="mt-3 text-xs font-bold text-amber-700 underline hover:text-amber-900"
    >
      Fill the form
    </button>
  </div>
);
// --------------------------------------------------------- end removable block

export const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const seo = usePageSeo('login', { title: t('auth.signIn') });
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await AuthService.login(formData.email, formData.password);
      
      // 1. Update Global Auth State
      login(user);
      
      // 2. Role-based redirect with history replacement
      // Small timeout ensures the Zustand store is committed before navigate checks role
      setTimeout(() => {
        if (user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/account', { replace: true });
        }
      }, 50);

    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <SEO title={seo.title} description={seo.description} noindex={seo.noindex} canonicalPath="/login" />
      
      {/* Left: Image (Hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
        <img 
          src="https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=1200" 
          alt="Login Visual" 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-16 text-white">
           <h2 className="font-heading text-4xl font-bold mb-4">{t('auth.unlockRadiance')}</h2>
           <p className="text-gray-200 max-w-md text-lg font-light">{t('auth.joinCommunity')}</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 lg:p-24 relative">
        <Link to="/" className="absolute top-8 left-8 text-gray-400 hover:text-brand-dark flex items-center gap-2 transition-colors">
           <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </Link>

        <div className="max-w-sm w-full mx-auto">
          <div className="mb-10">
            <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">{t('auth.welcomeBack')}</h1>
            <p className="text-gray-500">
              {t('auth.signInTitle')}
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-md">
                {error}
              </div>
            )}
            
            <Input
              label={t('checkout.email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="Enter your email"
              required
            />
            
            <div>
              <Input
                label={t('auth.password')}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter your password"
                required
              />
              <div className="flex justify-end mt-2">
                <a href="#" className="text-xs font-medium text-gray-500 hover:text-brand-green transition-colors">
                  {t('auth.forgotPassword')}
                </a>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              isLoading={isLoading}
            >
              {t('auth.signIn')}
            </Button>
          </form>

          {/* REMOVE BEFORE PUBLIC LAUNCH — see the block at the top of this file */}
          <AdminTestCredentials
            onUse={() => setFormData({ email: ADMIN_TEST_EMAIL, password: ADMIN_TEST_PASSWORD })}
          />

          <div className="mt-8 text-center border-t border-gray-100 pt-8">
             <p className="text-sm text-gray-600">
               {t('auth.dontHaveAccount')}{' '}
               <Link to="/register" className="font-bold text-brand-dark hover:text-brand-green transition-colors">
                 {t('auth.createAccount')}
               </Link>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

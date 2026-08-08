
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

export const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const seo = usePageSeo('register', { title: t('auth.createAccount') });
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { user, hasSession } = await AuthService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
      if (!hasSession) {
        setNeedsConfirm(true);
        return;
      }
      login(user);
      navigate('/account');
    } catch (err: any) {
      setError(err.message || t('auth.registerFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <SEO title={seo.title} description={seo.description} noindex={seo.noindex} canonicalPath="/register" />

      <div className="hidden lg:block lg:w-1/2 relative bg-gray-900">
        <img
          src="https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&q=80&w=1200"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-16 text-white">
          <h2 className="font-heading text-4xl font-bold mb-4">{t('auth.beginJourney')}</h2>
          <p className="text-gray-200 max-w-md text-lg font-light">{t('auth.joinCommunity')}</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 lg:p-24 relative">
        <Link to="/" className="absolute top-8 left-8 text-gray-400 hover:text-brand-dark flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </Link>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-10">
            <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">{t('auth.createAccount')}</h1>
            <p className="text-gray-500">{t('auth.fillDetails')}</p>
          </div>

          {needsConfirm ? (
            <div className="bg-green-50 border border-green-100 text-green-800 text-sm p-6 rounded-md space-y-4">
              <p className="font-medium">{t('auth.checkEmailTitle')}</p>
              <p>{t('auth.checkEmailBody', { email: formData.email })}</p>
              <Link to="/login" className="inline-block font-bold text-brand-dark hover:text-brand-green">
                {t('auth.signIn')}
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-md">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('checkout.firstName')}
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
                <Input
                  label={t('checkout.lastName')}
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>

              <Input
                label={t('checkout.email')}
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />

              <Input
                label={t('auth.password')}
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />

              <Input
                label={t('auth.confirmPassword')}
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />

              <Button type="submit" className="w-full h-12 mt-4" isLoading={isLoading}>
                {t('auth.createAccount')}
              </Button>
            </form>
          )}

          {!needsConfirm && (
            <div className="mt-8 text-center border-t border-gray-100 pt-8">
              <p className="text-sm text-gray-600">
                {t('auth.alreadyHaveAccount')}{' '}
                <Link to="/login" className="font-bold text-brand-dark hover:text-brand-green transition-colors">
                  {t('auth.signIn')}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthService } from '../services/auth-service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEO } from '../components/seo/SEO';

export const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await AuthService.requestPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || t('auth.resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      <SEO title={t('auth.forgotPassword')} noindex canonicalPath="/forgot-password" />
      <div className="w-full max-w-md mx-auto flex flex-col justify-center p-8 relative">
        <Link to="/login" className="absolute top-8 left-8 text-gray-400 hover:text-brand-dark flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </Link>

        <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2 mt-12">{t('auth.resetPassword')}</h1>
        <p className="text-gray-500 mb-8">{t('auth.resetPasswordHint')}</p>

        {sent ? (
          <div className="bg-green-50 border border-green-100 text-green-800 text-sm p-4 rounded-md">
            {t('auth.resetEmailSent')}
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-md">{error}</div>
            )}
            <Input
              label={t('checkout.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full h-12" isLoading={isLoading}>
              {t('auth.sendResetLink')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

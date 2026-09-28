import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth-store';
import { ensureRecall, identifyRecall } from '../../lib/recall';

export const RecallWidget = () => {
  const { i18n } = useTranslation();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  useEffect(() => {
    ensureRecall(i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    if (!isAuthenticated) return;
    ensureRecall(i18n.language);
    const script = document.querySelector('script[data-recall-widget]');
    const run = () => { identifyRecall().catch(() => undefined); };
    if (window.Recall) {
      run();
      return;
    }
    script?.addEventListener('load', run);
    return () => script?.removeEventListener('load', run);
  }, [isAuthenticated, i18n.language]);

  return null;
};

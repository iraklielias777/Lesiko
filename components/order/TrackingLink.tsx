import React from 'react';
import { useTranslation } from 'react-i18next';

export const TrackingLink: React.FC<{ href?: string; className?: string }> = ({ href, className = '' }) => {
  const { t } = useTranslation();
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-brand-green font-bold hover:underline ${className}`}
    >
      {t('checkout.trackShipment')}
    </a>
  );
};

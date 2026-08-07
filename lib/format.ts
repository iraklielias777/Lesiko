import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settings-store';

/**
 * Prices render in whatever currency the admin configured under Settings, so
 * switching the store to GEL does not require touching a hardcoded `$`
 * anywhere.
 */
export const formatPrice = (
  amount: number,
  currency: string,
  locale: string,
): string => {
  const value = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // An unrecognised currency code should degrade, not throw.
    return `${currency} ${value.toFixed(2)}`;
  }
};

/** Just the symbol, for input adornments where a full formatted price cannot go. */
export const currencySymbol = (currency: string, locale: string): string => {
  try {
    return (
      new Intl.NumberFormat(locale, { style: 'currency', currency })
        .formatToParts(0)
        .find(part => part.type === 'currency')?.value || currency
    );
  } catch {
    return currency;
  }
};

export const useCurrencySymbol = (): string => {
  const currency = useSettingsStore(s => s.settings.currency);
  const { i18n } = useTranslation();
  return currencySymbol(currency || 'USD', i18n.language === 'ka' ? 'ka-GE' : 'en-US');
};

export const useFormatPrice = () => {
  const currency = useSettingsStore(s => s.settings.currency);
  const { i18n } = useTranslation();
  const locale = i18n.language === 'ka' ? 'ka-GE' : 'en-US';

  return useCallback(
    (amount: number) => formatPrice(amount, currency || 'USD', locale),
    [currency, locale],
  );
};

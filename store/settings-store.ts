import { create } from 'zustand';
import { SeoPages, StoreSettings } from '../types';
import { ContentService, DEFAULT_SEO_PAGES, DEFAULT_STORE_SETTINGS } from '../services/content-service';
import i18n from '../i18n';
import { initAnalytics } from '../lib/analytics';

/**
 * The admin's default language applies until the visitor picks one with the
 * header toggle. That choice is remembered under its own key, so changing the
 * default later cannot flip a language somebody chose on purpose.
 */
export const LANGUAGE_CHOSEN_KEY = 'lesiko-lang-chosen';

const applyDefaultLanguage = (lang?: 'en' | 'ka') => {
  if (!lang || typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(LANGUAGE_CHOSEN_KEY)) return;
  } catch {
    return;
  }
  if (i18n.language !== lang) void i18n.changeLanguage(lang);
};

/**
 * Once the real domain is configured under Admin → SEO, anyone still arriving
 * on the Vercel preview host is sent there, path intact. Only preview hosts
 * move, only to an https origin, and only after that origin answers — so
 * setting the address a day before DNS resolves cannot strand anyone.
 */
const PREVIEW_HOST_SUFFIX = '.vercel.app';

const followCanonicalOrigin = (siteUrl?: string) => {
  if (typeof window === 'undefined' || !siteUrl) return;
  let canonical: URL;
  try {
    canonical = new URL(siteUrl);
  } catch {
    return;
  }
  const here = window.location;
  if (canonical.protocol !== 'https:' || canonical.host === here.host) return;
  if (!here.hostname.endsWith(PREVIEW_HOST_SUFFIX)) return;

  fetch(`${canonical.origin}/boot.js`, { mode: 'no-cors', cache: 'no-store' })
    .then(() => here.replace(`${canonical.origin}${here.pathname}${here.search}${here.hash}`))
    .catch(() => undefined);
};

interface SettingsState {
  settings: StoreSettings;
  seoPages: SeoPages;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_STORE_SETTINGS,
  seoPages: DEFAULT_SEO_PAGES,
  isLoaded: false,

  loadSettings: async () => {
    if (get().isLoaded) return;
    // Both blocks are site-wide config read on every page, so they travel
    // together rather than each page paying for its own round trip.
    const [settings, seoPages] = await Promise.all([
      ContentService.getStoreSettings(),
      ContentService.getSeoPages()
    ]);
    set({ settings, seoPages, isLoaded: true });
    applyDefaultLanguage(settings.defaultLanguage);
    initAnalytics(settings.gaMeasurementId);
    followCanonicalOrigin(settings.siteUrl);
  },
}));

export const calculateTotals = (subtotal: number, settings: StoreSettings) => {
  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingRate;
  const tax = subtotal * settings.taxRate;
  return { shipping, tax, total: subtotal + shipping + tax };
};

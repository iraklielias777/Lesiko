import { create } from 'zustand';
import { SeoPages, StoreSettings } from '../types';
import { ContentService, DEFAULT_SEO_PAGES, DEFAULT_STORE_SETTINGS } from '../services/content-service';

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
  },
}));

export const calculateTotals = (subtotal: number, settings: StoreSettings) => {
  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingRate;
  const tax = subtotal * settings.taxRate;
  return { shipping, tax, total: subtotal + shipping + tax };
};

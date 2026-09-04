
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types';
import { refreshSnapshot } from './wishlist-store';

interface RecentlyViewedState {
  items: Product[];
  /** When the snapshots were last replaced with live rows (ms since epoch). */
  refreshedAt: number;
  addProduct: (product: Product) => void;
  syncProducts: (live: Product[]) => void;
}

/** The rail shows on every product page; once every ten minutes is plenty. */
export const RECENTLY_VIEWED_REFRESH_MS = 10 * 60 * 1000;

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      refreshedAt: 0,
      syncProducts: (live) => {
        const byId = new Map(live.map(p => [p.id, p]));
        set((state) => ({
          items: state.items.filter(p => byId.has(p.id)).map(p => refreshSnapshot(p, byId.get(p.id)!)),
          refreshedAt: Date.now(),
        }));
      },
      addProduct: (product) => {
        set((state) => {
          // Remove if exists to push to top, limit to 10 items
          const filtered = state.items.filter((i) => i.id !== product.id);
          return { items: [product, ...filtered].slice(0, 10) };
        });
      },
    }),
    {
      name: 'lesiko-recently-viewed',
    }
  )
);

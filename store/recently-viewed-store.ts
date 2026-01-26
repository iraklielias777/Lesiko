
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types';

interface RecentlyViewedState {
  items: Product[];
  addProduct: (product: Product) => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
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

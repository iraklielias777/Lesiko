
import { create } from 'zustand';
import { Product } from '../types';

interface UIState {
  isQuickViewOpen: boolean;
  quickViewProduct: Product | null;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isQuickViewOpen: false,
  quickViewProduct: null,
  openQuickView: (product) => set({ isQuickViewOpen: true, quickViewProduct: product }),
  closeQuickView: () => set({ isQuickViewOpen: false, quickViewProduct: null }),
}));

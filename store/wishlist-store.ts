
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types';
import { useToastStore } from './toast-store';

interface WishlistState {
  items: Product[];
  savedItems: Product[]; // New 'Saved for Later' list
  
  // Actions
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  toggleItem: (product: Product) => void;
  
  moveToSaved: (product: Product) => void;
  moveToWishlist: (product: Product) => void;
  removeFromSaved: (productId: string) => void;
  
  // Computed
  isInWishlist: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      savedItems: [],

      addItem: (product) => {
        set((state) => {
          if (state.items.some(i => i.id === product.id)) return state;
          return { items: [...state.items, product] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
        useToastStore.getState().addToast('Removed from wishlist', 'info');
      },

      toggleItem: (product) => {
        const { items } = get();
        const exists = items.some(i => i.id === product.id);
        if (exists) {
            set({ items: items.filter(i => i.id !== product.id) });
            useToastStore.getState().addToast('Removed from wishlist', 'info');
        } else {
            set({ items: [...items, product] });
            useToastStore.getState().addToast('Added to wishlist');
        }
      },

      moveToSaved: (product) => {
        set((state) => ({
            items: state.items.filter(i => i.id !== product.id),
            savedItems: [...state.savedItems, product]
        }));
        useToastStore.getState().addToast('Saved for later');
      },

      moveToWishlist: (product) => {
        set((state) => ({
            savedItems: state.savedItems.filter(i => i.id !== product.id),
            items: [...state.items, product]
        }));
        useToastStore.getState().addToast('Moved back to wishlist');
      },

      removeFromSaved: (productId) => {
        set((state) => ({
            savedItems: state.savedItems.filter(i => i.id !== productId)
        }));
        useToastStore.getState().addToast('Removed from saved items', 'info');
      },

      isInWishlist: (productId) => {
        const { items } = get();
        return items.some((item) => item.id === productId);
      },
    }),
    {
      name: 'lesiko-wishlist-storage',
      version: 2,
    }
  )
);

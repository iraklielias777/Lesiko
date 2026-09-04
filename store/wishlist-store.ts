
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types';
import { useToastStore } from './toast-store';
import i18n from '../i18n';

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

  /** Replace stale snapshots with live catalogue rows; see refreshSnapshot. */
  syncProducts: (live: Product[]) => void;
}

/**
 * Stored snapshots go stale — a price drops, a shade sells out, a product is
 * withdrawn — so the pages that list them fetch the live rows and hand them
 * back here. Only the fields the catalogue owns are replaced; a product the
 * catalogue no longer returns is dropped.
 */
export const refreshSnapshot = (stored: Product, live: Product): Product => ({
  ...stored,
  name: live.name || stored.name,
  nameKa: live.nameKa ?? stored.nameKa,
  slug: live.slug || stored.slug,
  price: live.price,
  compareAtPrice: live.compareAtPrice,
  inventoryQuantity: live.inventoryQuantity,
  variants: live.variants ?? stored.variants,
  images: live.images?.length ? live.images : stored.images,
});


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

      syncProducts: (live) => {
        const byId = new Map(live.map(p => [p.id, p]));
        const refresh = (list: Product[]) =>
          list.filter(p => byId.has(p.id)).map(p => refreshSnapshot(p, byId.get(p.id)!));
        set((state) => ({ items: refresh(state.items), savedItems: refresh(state.savedItems) }));
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
        useToastStore.getState().addToast(i18n.t('wishlist.removed'), 'info');
      },

      toggleItem: (product) => {
        const { items } = get();
        const exists = items.some(i => i.id === product.id);
        if (exists) {
            set({ items: items.filter(i => i.id !== product.id) });
            useToastStore.getState().addToast(i18n.t('wishlist.removed'), 'info');
        } else {
            set({ items: [...items, product] });
            useToastStore.getState().addToast(i18n.t('wishlist.added'));
        }
      },

      moveToSaved: (product) => {
        set((state) => ({
            items: state.items.filter(i => i.id !== product.id),
            savedItems: [...state.savedItems, product]
        }));
        useToastStore.getState().addToast(i18n.t('wishlist.savedToast'));
      },

      moveToWishlist: (product) => {
        set((state) => ({
            savedItems: state.savedItems.filter(i => i.id !== product.id),
            items: [...state.items, product]
        }));
        useToastStore.getState().addToast(i18n.t('wishlist.movedBack'));
      },

      removeFromSaved: (productId) => {
        set((state) => ({
            savedItems: state.savedItems.filter(i => i.id !== productId)
        }));
        useToastStore.getState().addToast(i18n.t('wishlist.removedSaved'), 'info');
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

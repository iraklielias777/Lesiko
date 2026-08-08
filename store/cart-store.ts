
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, ProductVariant } from '../types';
import { useToastStore } from './toast-store';
import { ProductService } from '../services/product-service';

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  toggleCart: () => void;
  clearCart: () => void;
  /** Pull live catalogue prices (incl. sale price) into persisted cart lines. */
  refreshPrices: () => Promise<void>;

  getTotalItems: () => number;
  getSubtotal: () => number;
}

const availableStock = (product: Product, variant?: ProductVariant | null): number => {
  if (variant && typeof variant.inventoryQuantity === 'number') {
    return Math.max(0, variant.inventoryQuantity);
  }
  return Math.max(0, product.inventoryQuantity ?? 0);
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1, variant) => {
        set((state) => {
          const existingItem = state.items.find((item) => {
             const sameProduct = item.product.id === product.id;
             const sameVariant = item.selectedVariant?.id === variant?.id;
             return sameProduct && sameVariant;
          });

          const addToast = useToastStore.getState().addToast;
          const max = availableStock(product, variant);

          if (max <= 0) {
            addToast('This item is out of stock');
            return state;
          }

          const variantName = variant ? ` (${variant.name})` : '';
          const desired = (existingItem?.quantity || 0) + quantity;
          const nextQty = Math.min(desired, max);

          if (nextQty < desired) {
            addToast(`Only ${max} in stock for ${product.name}${variantName}`);
          } else {
            addToast(`Added ${product.name}${variantName} to cart`);
          }

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === existingItem.id
                  ? { ...item, quantity: nextQty }
                  : item
              ),
              isOpen: true,
            };
          }
          return {
            items: [...state.items, {
              id: crypto.randomUUID(),
              product,
              quantity: Math.min(quantity, max),
              selectedVariant: variant,
            }],
            isOpen: true,
          };
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity < 1) return;
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== itemId) return item;
            const max = availableStock(item.product, item.selectedVariant);
            return { ...item, quantity: Math.min(quantity, Math.max(1, max || 1)) };
          }),
        }));
      },

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      clearCart: () => set({ items: [] }),

      refreshPrices: async () => {
        const { items } = get();
        if (items.length === 0) return;

        const products = await ProductService.getProductsByIds(
          items.map((item) => item.product.id),
        );
        if (products.length === 0) return;

        const byId = new Map(products.map((p) => [p.id, p]));

        set({
          items: items.map((item) => {
            const live = byId.get(item.product.id);
            if (!live) return item;

            let selectedVariant = item.selectedVariant;
            if (selectedVariant) {
              const match =
                live.variants?.find((v) => v.id && v.id === selectedVariant!.id) ||
                live.variants?.find((v) => v.name === selectedVariant!.name);
              if (match) {
                selectedVariant = { ...selectedVariant, ...match };
              }
            }

            const max = availableStock(live, selectedVariant);
            const quantity = max > 0 ? Math.min(item.quantity, max) : item.quantity;

            return {
              ...item,
              product: {
                ...item.product,
                ...live,
                // Keep the cart's product object shape while overwriting price fields.
                price: live.price,
                compareAtPrice: live.compareAtPrice,
                inventoryQuantity: live.inventoryQuantity,
                variants: live.variants,
              },
              selectedVariant,
              quantity,
            };
          }),
        });
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => {
            const price = item.selectedVariant?.price || item.product.price;
            return total + (price * item.quantity);
        }, 0);
      },
    }),
    {
      name: 'lesiko-cart-storage',
    }
  )
);

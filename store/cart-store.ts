
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, ProductVariant } from '../types';
import { useToastStore } from './toast-store';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  
  // Actions
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  toggleCart: () => void;
  clearCart: () => void;
  
  // Computed
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1, variant) => {
        set((state) => {
          // Identify duplicate based on Product ID AND Variant ID (if exists)
          const existingItem = state.items.find((item) => {
             const sameProduct = item.product.id === product.id;
             const sameVariant = item.selectedVariant?.id === variant?.id;
             return sameProduct && sameVariant;
          });

          const addToast = useToastStore.getState().addToast;
          
          const variantName = variant ? ` (${variant.name})` : '';
          addToast(`Added ${product.name}${variantName} to cart`);

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === existingItem.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
              isOpen: true, // Open cart on add
            };
          }
          return {
            items: [...state.items, { id: crypto.randomUUID(), product, quantity, selectedVariant: variant }],
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
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => {
            // Use variant price if available, otherwise base price
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

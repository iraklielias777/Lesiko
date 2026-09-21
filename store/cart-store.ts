
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, ProductVariant } from '../types';
import { useToastStore } from './toast-store';
import { ProductService } from '../services/product-service';
import { useSettingsStore } from './settings-store';
import i18n from '../i18n';
import { itemOf, track } from '../lib/analytics';
import { resolvePrice } from '../lib/pricing';
import { WhisperrEvents } from '../whisperr-events';

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
        const existingItem = get().items.find((item) => {
           const sameProduct = item.product.id === product.id;
           const sameVariant = item.selectedVariant?.id === variant?.id;
           return sameProduct && sameVariant;
        });

        const addToast = useToastStore.getState().addToast;
        const max = availableStock(product, variant);
        const desired = (existingItem?.quantity || 0) + quantity;

        if (max <= 0) {
          addToast(i18n.t('cart.outOfStockToast'));
          WhisperrEvents.addToCartBlockedByStock({
            productId: product.id,
            variantId: variant?.id ?? null,
            stockOutcome: 'out_of_stock',
            requestedQuantity: desired,
            availableInventory: max,
          });
          return;
        }

        const variantName = variant ? ` (${variant.name})` : '';
        const nextQty = Math.min(desired, max);

        if (existingItem) {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === existingItem.id
                ? { ...item, quantity: nextQty }
                : item
            ),
            isOpen: true,
          }));
        } else {
          set((state) => ({
            items: [...state.items, {
              id: crypto.randomUUID(),
              product,
              quantity: Math.min(quantity, max),
              selectedVariant: variant,
            }],
            isOpen: true,
          }));
        }

        // No "added" toast: the drawer opens with the item at the top, and a
        // toast on top of the drawer only ever covered its checkout button.
        if (nextQty < desired) {
          addToast(i18n.t('cart.onlyInStock', { count: max, name: `${product.name}${variantName}` }));
          WhisperrEvents.addToCartBlockedByStock({
            productId: product.id,
            variantId: variant?.id ?? null,
            stockOutcome: 'quantity_capped',
            requestedQuantity: desired,
            availableInventory: max,
          });
        } else {
          const addedQty = nextQty - (existingItem?.quantity || 0);
          const currency = useSettingsStore.getState().settings.currency || 'GEL';
          track('add_to_cart', {
            currency,
            value: resolvePrice(product, variant).price * addedQty,
            items: [itemOf(product, variant, addedQty)],
          });
          WhisperrEvents.addToCart({
            productId: product.id,
            variantId: variant?.id ?? null,
            quantity: addedQty,
            value: resolvePrice(product, variant).price * addedQty,
            currency,
          });
        }
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity < 1) return;
        const target = get().items.find((item) => item.id === itemId);
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== itemId) return item;
            const max = availableStock(item.product, item.selectedVariant);
            return { ...item, quantity: Math.min(quantity, Math.max(1, max || 1)) };
          }),
        }));
        if (!target) return;
        const available = availableStock(target.product, target.selectedVariant);
        WhisperrEvents.cartItemQuantityChanged({
          cartItemId: target.id,
          productId: target.product.id,
          variantId: target.selectedVariant?.id ?? null,
          requestedQuantity: quantity,
          storedQuantity: Math.min(quantity, Math.max(1, available || 1)),
          availableQuantity: available,
        });
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
            const price = resolvePrice(item.product, item.selectedVariant).price;
            return total + (price * item.quantity);
        }, 0);
      },
    }),
    {
      name: 'lesiko-cart-storage',
      // Only the lines. `isOpen` used to persist too, so a drawer left open
      // reopened itself on the next visit before anything was clicked.
      partialize: (state) => ({ items: state.items }),
    }
  )
);

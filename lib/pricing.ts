import type { Product, ProductVariant } from '../types';

/**
 * The one answer to "what does this cost, and is it on sale?" — used by the
 * cards, the product page, the sticky buy bar, the bag, the checkout and the
 * analytics events, and mirrored in supabase/functions/payments/index.ts so the
 * amount charged is always the amount shown. Keep the two in step.
 *
 * Rules, in order:
 *  1. A product is on sale when its compare-at price is above its price
 *     (the `is_on_sale` column in the database says the same thing).
 *  2. A variant with no price of its own follows the product: same price, same
 *     strikethrough.
 *  3. A variant with its own compare-at above its own price is on sale by
 *     itself, with its own numbers.
 *  4. A variant whose own price equals the product's compare-at is the old
 *     price copied into every shade before the sale was set — it follows the
 *     product's sale rather than undercutting it.
 *  5. Any other variant price is that variant's price, with no strikethrough.
 */
export interface ResolvedPrice {
  /** What the shopper pays. */
  price: number;
  /** The struck-through price, present only when it is genuinely higher. */
  compareAt?: number;
  /** Whole-number percentage off; 0 when not on sale. */
  discountPercent: number;
  onSale: boolean;
}

type PricedProduct = Pick<Product, 'price' | 'compareAtPrice'>;
type PricedVariant = Pick<ProductVariant, 'price' | 'compareAtPrice'>;

const isMoney = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const same = (a: number, b: number) => Math.abs(a - b) < 0.005;

export const resolvePrice = (
  product: PricedProduct,
  variant?: PricedVariant | null,
): ResolvedPrice => {
  const base = isMoney(product.price) ? product.price : 0;
  const baseCompare =
    isMoney(product.compareAtPrice) && product.compareAtPrice > base ? product.compareAtPrice : undefined;

  let price = base;
  let compareAt = baseCompare;

  if (variant && isMoney(variant.price)) {
    if (isMoney(variant.compareAtPrice) && variant.compareAtPrice > variant.price) {
      price = variant.price;
      compareAt = variant.compareAtPrice;
    } else if (baseCompare !== undefined && same(variant.price, baseCompare)) {
      price = base;
      compareAt = baseCompare;
    } else {
      price = variant.price;
      compareAt = undefined;
    }
  }

  const onSale = compareAt !== undefined && compareAt > price;
  const discountPercent = onSale && compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
  return { price, compareAt: onSale ? compareAt : undefined, discountPercent, onSale };
};

/** True when a variant's own price stops the product's sale from reaching it. */
export const variantBreaksSale = (product: PricedProduct, variant: PricedVariant): boolean =>
  resolvePrice(product).onSale && !resolvePrice(product, variant).onSale;

import { Product, ProductImage, ProductVariant } from '../types';
import { ImageResize } from './image-url';

/**
 * One place that decides how a product photo is framed.
 *
 * Since normalisation (lib/image-normalize.ts) every product photo is a square
 * whose padding is the backdrop the product was shot on. Painting the frame
 * that same colour makes the join invisible, which is what lets a white
 * cut-out and a grey studio shot sit in the same grid without one of them
 * looking like a pasted-in rectangle.
 *
 * Images uploaded before normalisation carry no `bgColor`. They keep the
 * neutral well the design has always used, so nothing regresses while the
 * backfill runs.
 */

/** Matches the `bg-gray-50` the cards used before backdrops were recorded. */
export const LEGACY_FRAME = '#F9FAFB';

export const primaryImageOf = (product: Pick<Product, 'images'>): ProductImage | undefined =>
  product.images?.find(img => img.isPrimary) || product.images?.[0];

/** Canonical keys stored on `products.tags` and used by the skin-type filter. */
export const SKIN_TYPE_KEYS = ['normal', 'dry', 'oily', 'combination', 'sensitive'] as const;

export const isSkinTypeKey = (tag: string): boolean =>
  SKIN_TYPE_KEYS.includes(tag.trim().toLowerCase() as (typeof SKIN_TYPE_KEYS)[number]);

export const claimedUrls = (product: Pick<Product, 'variants'>): Set<string> => {
  const urls = new Set<string>();
  for (const variant of product.variants || []) {
    if (variant.imageUrl) urls.add(variant.imageUrl);
  }
  return urls;
};

/**
 * Legacy rows only stored `variant.imageUrl`. Treat a matching gallery URL as
 * owned by that variant so the storefront filters correctly before the next save.
 */
export const withVariantOwnership = (
  product: Pick<Product, 'images' | 'variants'>,
): ProductImage[] => {
  const urlToVariant = new Map<string, string>();
  for (const variant of product.variants || []) {
    if (variant.imageUrl) urlToVariant.set(variant.imageUrl, variant.id);
  }
  return (product.images || []).map(img => {
    if (img.variantId) return img;
    const inferred = urlToVariant.get(img.url);
    return inferred ? { ...img, variantId: inferred } : img;
  });
};

/**
 * Photos the shopper should see for the selected option: that variant's shots,
 * plus unassigned product-level images. Other variants' photos stay hidden.
 * A product with no variants returns the full gallery.
 */
export const galleryFor = (
  product: Pick<Product, 'images' | 'variants'>,
  variant?: ProductVariant | null,
): ProductImage[] => {
  if (!product.variants?.length) return product.images || [];
  const images = withVariantOwnership(product);
  const claimed = claimedUrls(product);
  return images.filter(img => {
    if (variant && (img.variantId === variant.id || img.url === variant.imageUrl)) return true;
    if (img.variantId) return false;
    if (claimed.has(img.url)) return false;
    return true;
  });
};

export const defaultVariantOf = (product: Pick<Product, 'variants'>): ProductVariant | null => {
  const variants = product.variants || [];
  if (!variants.length) return null;
  return variants.find(v => v.inventoryQuantity > 0) || variants[0];
};

export const galleryIndexFor = (gallery: ProductImage[], variant?: ProductVariant | null): number => {
  if (variant?.imageUrl) {
    const idx = gallery.findIndex(img => img.url === variant.imageUrl);
    if (idx >= 0) return idx;
  }
  return 0;
};

export const frameColor = (image?: Pick<ProductImage, 'bgColor'>): string =>
  image?.bgColor || LEGACY_FRAME;

/**
 * A normalised packshot already fills its square, so `contain` is a no-op that
 * guarantees we never crop a label. A lifestyle photo has no dead space to
 * preserve and reads better filling the frame.
 */
export const fitClass = (image?: Pick<ProductImage, 'fit'>): string =>
  image?.fit === 'cover' ? 'object-cover' : 'object-contain';

/** Same choice as `fitClass`, for the Supabase render `resize` param. */
export const resizeOf = (image?: Pick<ProductImage, 'fit'>): ImageResize =>
  image?.fit === 'cover' ? 'cover' : 'contain';

/** Convenience for the many places that render a thumbnail of a cart line. */
export const thumbStyle = (image?: Pick<ProductImage, 'bgColor'>) => ({
  backgroundColor: frameColor(image),
});

/**
 * What `sizes` should say for each grid a ProductCard appears in.
 *
 * These are measured in the browser at every breakpoint, not derived. The
 * Tailwind container is capped per breakpoint, so within each band the card is
 * a constant number of CSS pixels — which is why these are absolute lengths
 * rather than `vw`. An absolute length is exact; a `vw` value is only ever
 * right at one viewport in the band.
 *
 * Getting this wrong is not cosmetic, and the old blanket
 * `25vw / 33vw / 50vw` was wrong in both directions. On a 375px phone it
 * declared 188px for a card that renders at 327px — a 43% under-declaration,
 * so every product image on mobile was fetched at roughly half the resolution
 * it needed and looked soft. On a 1280px desktop it over-declared by 10%,
 * pushing a 2x screen from the 600w candidate to the 900w one.
 */
export const CARD_SIZES = {
  /** Homepage "Trending": 4-up from md, a 260px snap rail below that. */
  rail4: '(min-width: 1536px) 330px, (min-width: 1280px) 265px, (min-width: 1024px) 201px, (min-width: 768px) 138px, 260px',
  /** Listing page: 3-up beside the 256px filter sidebar, 2-up from sm, 1-up below. */
  listing3: '(min-width: 1536px) 368px, (min-width: 1024px) 291px, (min-width: 768px) 337px, (min-width: 640px) 268px, 87vw',
  /** Related products on the detail page: 4-up, no sidebar. */
  related4: '(min-width: 1536px) 346px, (min-width: 1280px) 282px, (min-width: 1024px) 218px, (min-width: 640px) 46vw, 87vw',
  /** Recently viewed: 5-up from lg, 4-up from md, a 200px rail below. */
  rail5: '(min-width: 1536px) 272px, (min-width: 1280px) 220px, (min-width: 1024px) 168px, (min-width: 768px) 156px, 200px',
} as const;

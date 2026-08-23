/**
 * Supabase serves resized variants of a stored object from `/render/image/`,
 * and negotiates WebP/AVIF from the browser's Accept header. Uploads are
 * already capped at 2000px (see lib/image-compress.ts), but a product grid
 * thumbnail needs a fraction of that, so requesting a per-breakpoint width
 * cuts what actually crosses the wire by another 5-10x.
 *
 * Non-Supabase URLs — the Unsplash seed images, anything pasted by hand — are
 * returned untouched, and get no srcset.
 */

const OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

const DEFAULT_QUALITY = 75;

export const isTransformable = (url?: string): boolean =>
  !!url && url.includes(OBJECT_PATH);

export interface ImageUrlOptions {
  width: number;
  quality?: number;
}

export const imageUrl = (url: string, { width, quality = DEFAULT_QUALITY }: ImageUrlOptions): string => {
  if (!isTransformable(url)) return url;

  const [base] = url.split('?');
  return `${base.replace(OBJECT_PATH, RENDER_PATH)}?width=${width}&quality=${quality}`;
};

/**
 * Every transform Supabase renders is cached separately, so asking for 63px on
 * one page and 65px on another doubles the work and halves the hit rate.
 * Requests snap up to this ladder instead.
 */
export const IMAGE_WIDTHS = [96, 160, 240, 320, 450, 600, 900, 1200] as const;

export const snapWidth = (target: number): number =>
  IMAGE_WIDTHS.find(width => width >= target) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];

/**
 * A fixed-size thumbnail knows its own CSS width, so it wants density
 * descriptors rather than `sizes` — the browser picks by screen DPR and never
 * has to guess at layout.
 */
export const thumbSrc = (url: string, cssWidth: number): string =>
  imageUrl(url, { width: snapWidth(cssWidth) });

export const thumbSrcSet = (url: string, cssWidth: number): string | undefined => {
  if (!isTransformable(url)) return undefined;
  const one = snapWidth(cssWidth);
  const two = snapWidth(cssWidth * 2);
  if (two === one) return undefined;
  return `${imageUrl(url, { width: one })} 1x, ${imageUrl(url, { width: two })} 2x`;
};

/** Returns undefined for URLs we cannot resize, so the caller omits the attribute. */
export const imageSrcSet = (
  url: string,
  widths: number[],
  quality = DEFAULT_QUALITY,
): string | undefined => {
  if (!isTransformable(url)) return undefined;
  return widths.map(w => `${imageUrl(url, { width: w, quality })} ${w}w`).join(', ');
};

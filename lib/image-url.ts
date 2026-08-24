/**
 * Supabase serves resized variants of a stored object from `/render/image/`,
 * and negotiates WebP/AVIF from the browser's Accept header. Uploads are
 * already capped at 2000px (see lib/image-compress.ts), but a product grid
 * thumbnail needs a fraction of that, so requesting a per-breakpoint width
 * cuts what actually crosses the wire by another 5-10x.
 *
 * Width-only transforms keep the original height. A 1200×1200 packshot then
 * arrives as 600×1200, and `object-contain` in a square card letterboxes it
 * into a vertical sliver. Height is therefore always sent, defaulting to the
 * same value as width (a square). `resize=contain` letterboxes; `cover` fills.
 *
 * Non-Supabase URLs — the Unsplash seed images, anything pasted by hand — are
 * returned untouched, and get no srcset.
 */

const OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

const DEFAULT_QUALITY = 75;

export const isTransformable = (url?: string): boolean =>
  !!url && url.includes(OBJECT_PATH);

export type ImageResize = 'contain' | 'cover';

export interface ImageUrlOptions {
  width: number;
  /** Defaults to `width` so product squares stay squares. */
  height?: number;
  quality?: number;
  /** Defaults to `contain` so labels are never cropped. */
  resize?: ImageResize;
}

export const imageUrl = (
  url: string,
  { width, height = width, quality = DEFAULT_QUALITY, resize = 'contain' }: ImageUrlOptions,
): string => {
  if (!isTransformable(url)) return url;

  const [base] = url.split('?');
  return `${base.replace(OBJECT_PATH, RENDER_PATH)}?width=${width}&height=${height}&resize=${resize}&quality=${quality}`;
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
export const thumbSrc = (
  url: string,
  cssWidth: number,
  options: Pick<ImageUrlOptions, 'resize' | 'quality'> = {},
): string => {
  const width = snapWidth(cssWidth);
  return imageUrl(url, { width, height: width, ...options });
};

export const thumbSrcSet = (
  url: string,
  cssWidth: number,
  options: Pick<ImageUrlOptions, 'resize' | 'quality'> = {},
): string | undefined => {
  if (!isTransformable(url)) return undefined;
  const one = snapWidth(cssWidth);
  const two = snapWidth(cssWidth * 2);
  if (two === one) return undefined;
  return `${imageUrl(url, { width: one, height: one, ...options })} 1x, ${imageUrl(url, { width: two, height: two, ...options })} 2x`;
};

/**
 * `height`, when set, is the height at the largest width in the list; smaller
 * candidates keep the same aspect.
 */
export const imageSrcSet = (
  url: string,
  widths: number[],
  options: Omit<ImageUrlOptions, 'width'> = {},
): string | undefined => {
  if (!isTransformable(url)) return undefined;
  const refW = Math.max(...widths);
  const refH = options.height ?? refW;
  return widths
    .map(w => {
      const height = Math.max(1, Math.round((w * refH) / refW));
      return `${imageUrl(url, { ...options, width: w, height })} ${w}w`;
    })
    .join(', ');
};

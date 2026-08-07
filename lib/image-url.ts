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

/** Returns undefined for URLs we cannot resize, so the caller omits the attribute. */
export const imageSrcSet = (
  url: string,
  widths: number[],
  quality = DEFAULT_QUALITY,
): string | undefined => {
  if (!isTransformable(url)) return undefined;
  return widths.map(w => `${imageUrl(url, { width: w, quality })} ${w}w`).join(', ');
};

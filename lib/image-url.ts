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
 * Every distinct (url, width, height, resize) is a separate transform, and a
 * transform nobody has requested yet costs ~2.5 s at the origin before the CDN
 * can serve it. The storefront used to ask for ~15 different widths per image;
 * every request now snaps to IMAGE_WIDTHS, so an image has at most five
 * variants, the media function can warm all of them the moment it is
 * uploaded, and the CDN hit rate stops depending on which page you came from.
 *
 * Non-Supabase URLs — anything pasted by hand — are returned untouched, and
 * get no srcset.
 */

const OBJECT_PATH = '/storage/v1/object/public/';
const RENDER_PATH = '/storage/v1/render/image/public/';

const DEFAULT_QUALITY = 75;

export const isTransformable = (url?: string): boolean =>
  !!url && url.includes(OBJECT_PATH);

export type ImageResize = 'contain' | 'cover';

/**
 * The only widths ever requested. Mirrored by WARM_WIDTHS in
 * supabase/functions/media/index.ts and by scripts/warm-images.mjs, which
 * pre-request exactly these so a shopper never pays for a cold transform.
 * 1600 exists for the homepage hero alone; product imagery tops out at 1200.
 */
export const IMAGE_WIDTHS = [160, 320, 640, 1200, 1600] as const;

export const snapWidth = (target: number): number =>
  IMAGE_WIDTHS.find(width => width >= target) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];

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
  { width, height, quality = DEFAULT_QUALITY, resize = 'contain' }: ImageUrlOptions,
): string => {
  if (!isTransformable(url)) return url;

  const snapped = snapWidth(width);
  // An explicit height scales with the width so the requested aspect survives
  // the snap; an omitted one means "square", which is what every product
  // surface wants.
  const snappedHeight = height === undefined
    ? snapped
    : Math.max(1, Math.round(height * (snapped / width)));

  const [base] = url.split('?');
  return `${base.replace(OBJECT_PATH, RENDER_PATH)}?width=${snapped}&height=${snappedHeight}&resize=${resize}&quality=${quality}`;
};

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
 * candidates keep the same aspect. Widths snap to the ladder and collapse, so
 * `[300, 450, 600, 900]` becomes the three real variants 320w, 640w, 1200w.
 */
export const imageSrcSet = (
  url: string,
  widths: number[],
  options: Omit<ImageUrlOptions, 'width'> = {},
): string | undefined => {
  if (!isTransformable(url)) return undefined;
  const refW = Math.max(...widths);
  const refH = options.height ?? refW;
  const seen = new Set<number>();
  return widths
    .map(snapWidth)
    .filter(w => (seen.has(w) ? false : (seen.add(w), true)))
    .sort((a, b) => a - b)
    .map(w => {
      const height = Math.max(1, Math.round((w * refH) / refW));
      return `${imageUrl(url, { ...options, width: w, height })} ${w}w`;
    })
    .join(', ');
};

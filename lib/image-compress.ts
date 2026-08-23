/**
 * Client-side image processing, applied to every admin upload.
 *
 * Two jobs, in order:
 *
 *   1. Normalise (product photos only) — strip the supplier's framing and
 *      re-centre the product on a canonical square. See lib/image-normalize.ts
 *      for why this has to happen at ingest rather than in CSS.
 *   2. Compress — storage bills for what is stored and what is served, and a
 *      phone camera produces 4-8 MB JPEGs that no product page needs.
 *      Downscaling to a 2000px longest edge and re-encoding as WebP at q0.82 is
 *      visually lossless at any size the storefront renders, and typically cuts
 *      the file by 10-20x.
 *
 * Doing both in the browser rather than in the Edge Function means one
 * implementation covers the file picker and "add by URL" alike, and the bytes
 * never leave the machine at full size.
 */

import { ImageFit, NormalizeResult, normalizeProductImage } from './image-normalize';

export interface CompressedImage {
  blob: Blob;
  name: string;
  /** Detected backdrop as #rrggbb, so the card can paint a seamless frame. */
  bgColor?: string;
  fit?: ImageFit;
  /** Share of the frame the product fills; low means a weak source asset. */
  fillRatio?: number;
  upscale?: number;
  /** False when the image was stored as shot (lifestyle photo, SVG, GIF). */
  normalized?: boolean;
}

export interface CompressOptions {
  /**
   * Re-frame onto the canonical product square. Only product photography wants
   * this — a category hero or the homepage banner is a composition, and
   * squaring it would destroy the crop.
   */
  normalize?: boolean;
}

const MAX_EDGE = 2000;
const QUALITY = 0.82;

// A canvas would rasterise an SVG at a fixed size and flatten a GIF to its
// first frame, so those pass through untouched.
const PASSTHROUGH_TYPES = new Set(['image/svg+xml', 'image/gif']);

const withExtension = (name: string, ext: string) => {
  const base = name.replace(/\.[^./\\]+$/, '') || 'image';
  return `${base}.${ext}`;
};

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

const encodeWebpFrom = async (canvas: AnyCanvas): Promise<Blob | null> => {
  if (typeof OffscreenCanvas === 'function' && canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/webp', quality: QUALITY });
  }
  return new Promise<Blob | null>(resolve =>
    (canvas as HTMLCanvasElement).toBlob(resolve, 'image/webp', QUALITY),
  );
};

const drawScaled = (bitmap: ImageBitmap, width: number, height: number): AnyCanvas | null => {
  const canvas: AnyCanvas =
    typeof OffscreenCanvas === 'function'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height });

  const ctx = (canvas as HTMLCanvasElement).getContext('2d') as
    | OffscreenCanvasRenderingContext2D
    | CanvasRenderingContext2D
    | null;
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
};

/**
 * Always resolves: an image that cannot be decoded or encoded is returned
 * unchanged rather than failing the upload.
 */
export async function compressImage(
  source: Blob,
  fileName = 'image',
  options: CompressOptions = {},
): Promise<CompressedImage> {
  const type = source.type.split(';')[0].trim().toLowerCase();

  if (PASSTHROUGH_TYPES.has(type)) return { blob: source, name: fileName, normalized: false };
  if (typeof createImageBitmap !== 'function') return { blob: source, name: fileName, normalized: false };

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(source);

    // ---------------------------------------------------------- normalise
    if (options.normalize) {
      let report: NormalizeResult | null = null;
      try {
        report = normalizeProductImage(bitmap, bitmap.width, bitmap.height);
      } catch {
        report = null;
      }

      if (report?.canvas) {
        const encoded = await encodeWebpFrom(report.canvas);
        if (encoded) {
          return {
            blob: encoded,
            name: withExtension(fileName, 'webp'),
            bgColor: report.bgColor,
            fit: report.fit,
            fillRatio: report.fillRatio,
            upscale: report.upscale,
            normalized: true,
          };
        }
      }

      // Lifestyle shot, or normalisation bailed: fall through to plain
      // compression but keep what we learned, so the card still frames it right.
      const plain = await compressOnly(bitmap, source, fileName);
      return {
        ...plain,
        bgColor: report?.bgColor,
        fit: report?.fit ?? 'contain',
        fillRatio: report?.fillRatio,
        upscale: report?.upscale,
        normalized: false,
      };
    }

    return { ...(await compressOnly(bitmap, source, fileName)), normalized: false };
  } catch {
    return { blob: source, name: fileName, normalized: false };
  } finally {
    bitmap?.close();
  }
}

/** Downscale-and-re-encode, with no reframing. */
async function compressOnly(
  bitmap: ImageBitmap,
  source: Blob,
  fileName: string,
): Promise<{ blob: Blob; name: string }> {
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = drawScaled(bitmap, width, height);
  if (!canvas) return { blob: source, name: fileName };

  const encoded = await encodeWebpFrom(canvas);
  if (!encoded) return { blob: source, name: fileName };

  // An already-optimised small image can re-encode larger; keep the original
  // unless we also downscaled it, in which case fewer pixels still wins.
  if (scale === 1 && encoded.size >= source.size) {
    return { blob: source, name: fileName };
  }

  return { blob: encoded, name: withExtension(fileName, 'webp') };
}

/**
 * Client-side image compression, applied to every admin upload.
 *
 * Storage bills for what is stored and what is served, and a phone camera
 * produces 4-8 MB JPEGs that no product page needs. Downscaling to a 2000px
 * longest edge and re-encoding as WebP at q0.82 is visually lossless at any
 * size the storefront renders, and typically cuts the file by 10-20x.
 *
 * Doing it in the browser rather than in the Edge Function means one
 * implementation covers both the file picker and "add by URL", and the bytes
 * never leave the machine at full size.
 */

export interface CompressedImage {
  blob: Blob;
  name: string;
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

const encodeWebp = async (
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Blob | null> => {
  if (typeof OffscreenCanvas === 'function') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: 'image/webp', quality: QUALITY });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/webp', QUALITY),
  );
};

/**
 * Always resolves: an image that cannot be decoded or encoded is returned
 * unchanged rather than failing the upload.
 */
export async function compressImage(
  source: Blob,
  fileName = 'image',
): Promise<CompressedImage> {
  const type = source.type.split(';')[0].trim().toLowerCase();

  if (PASSTHROUGH_TYPES.has(type)) return { blob: source, name: fileName };
  if (typeof createImageBitmap !== 'function') return { blob: source, name: fileName };

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(source);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const encoded = await encodeWebp(bitmap, width, height);
    if (!encoded) return { blob: source, name: fileName };

    // An already-optimised small image can re-encode larger; keep the original
    // unless we also downscaled it, in which case fewer pixels still wins.
    if (scale === 1 && encoded.size >= source.size) {
      return { blob: source, name: fileName };
    }

    return { blob: encoded, name: withExtension(fileName, 'webp') };
  } catch {
    return { blob: source, name: fileName };
  } finally {
    bitmap?.close();
  }
}

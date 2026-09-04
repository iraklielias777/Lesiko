import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../lib/supabase';
import { compressImage } from '../lib/image-compress';
import { ImageFit } from '../lib/image-normalize';

// Every write goes through the `media` Edge Function rather than the storage
// API directly: storage.objects has RLS enabled with no policies, so the
// browser's publishable key cannot write to the bucket at all. The function
// re-checks that the caller is an admin before using the service role.
// Reads are unaffected — the bucket is public, so the returned URL just works.
//
// Images are processed in the browser first (see lib/image-compress.ts), so the
// bucket only ever receives display-sized files. Product photos are also
// re-framed onto the canonical square; see lib/image-normalize.ts.

type MediaResponse = { path: string; publicUrl: string };

/** Only product photography is re-framed. See PRODUCT_FOLDER below. */
const PRODUCT_FOLDER = 'products';

export interface UploadedImage {
  url: string;
  /** Detected backdrop as #rrggbb, for a seamless card frame. */
  bgColor?: string;
  fit?: ImageFit;
  /** Share of the square the product fills. Low means a weak source asset. */
  fillRatio?: number;
  /** Magnification applied; above ~1.6 the card will look soft. */
  upscale?: number;
  /** False when stored as shot — a lifestyle photo, an SVG, or a decode failure. */
  normalized: boolean;
}

const invoke = async <T>(body: FormData | Record<string, unknown>): Promise<T> => {
  if (!supabase) throw new Error('Supabase client not initialized');

  const { data, error } = await supabase.functions.invoke('media', { body });

  if (error) {
    // FunctionsHttpError keeps the useful message in the response body.
    const detail = await (error as any)?.context?.json?.().catch(() => null);
    throw new Error(detail?.error || error.message || 'Media request failed');
  }
  return data as T;
};

const uploadBlob = async (blob: Blob, name: string, folder: string): Promise<UploadedImage> => {
  const processed = await compressImage(blob, name, { normalize: folder === PRODUCT_FOLDER });

  const form = new FormData();
  form.append('file', processed.blob, processed.name);
  form.append('folder', folder);
  // Lets the function pre-warm the exact transforms the storefront will ask
  // for — cover for a lifestyle shot, contain for a packshot.
  form.append('fit', processed.fit === 'cover' ? 'cover' : 'contain');

  const { publicUrl } = await invoke<MediaResponse>(form);
  return {
    url: publicUrl,
    bgColor: processed.bgColor,
    fit: processed.fit,
    fillRatio: processed.fillRatio,
    upscale: processed.upscale,
    normalized: !!processed.normalized,
  };
};

/**
 * Pulls an image from an external URL through the Edge Function — the fetch has
 * to be server-side because image hosts do not send CORS headers — and hands
 * back the raw bytes for the same local processing a picked file gets.
 */
const fetchRemote = async (url: string): Promise<{ blob: Blob; name: string }> => {
  if (!supabase) throw new Error('Supabase client not initialized');

  // `functions.invoke` decodes any non-octet-stream response as text, which
  // would corrupt the bytes, so this one call is made directly.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('You must be signed in to upload');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'fetch-url', url }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error || `Could not fetch that image (${response.status})`);
  }

  const mime = response.headers.get('X-Source-Content-Type') || 'image/jpeg';
  const name = response.headers.get('X-Source-Filename') || 'image';
  const bytes = await response.blob();

  return { blob: new Blob([bytes], { type: mime }), name };
};

export const StorageService = {
  /** Upload and return the public URL. Use for non-product imagery. */
  uploadFile: async (file: File | Blob, folder: string = PRODUCT_FOLDER): Promise<string> => {
    const name = file instanceof File ? file.name : 'upload.jpg';
    const { url } = await uploadBlob(file, name, folder);
    return url;
  },

  /**
   * Upload a product photo and report how it was re-framed, so the row can
   * carry the backdrop colour and the admin can flag a weak source.
   */
  uploadProductImage: async (file: File | Blob): Promise<UploadedImage> => {
    const name = file instanceof File ? file.name : 'upload.jpg';
    return uploadBlob(file, name, PRODUCT_FOLDER);
  },

  uploadFromUrl: async (url: string, folder: string = PRODUCT_FOLDER): Promise<string> => {
    const { blob, name } = await fetchRemote(url);
    const uploaded = await uploadBlob(blob, name, folder);
    return uploaded.url;
  },

  uploadProductImageFromUrl: async (url: string): Promise<UploadedImage> => {
    const { blob, name } = await fetchRemote(url);
    return uploadBlob(blob, name, PRODUCT_FOLDER);
  },

  deleteFile: async (url: string): Promise<void> => {
    if (!supabase || !url) return;

    // Public URLs look like .../storage/v1/object/public/media/products/x.jpg;
    // a render URL adds transform query params that are not part of the path.
    const [, rest] = url.split('/media/');
    const path = rest?.split('?')[0];
    if (!path) return;

    try {
      await invoke({ action: 'delete', path });
    } catch (e) {
      // A stale image reference should never block saving the row that
      // replaced it.
      console.error('Failed to delete storage file:', e);
    }
  },
};

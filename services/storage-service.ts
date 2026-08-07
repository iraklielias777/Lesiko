import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../lib/supabase';
import { compressImage } from '../lib/image-compress';

// Every write goes through the `media` Edge Function rather than the storage
// API directly: storage.objects has RLS enabled with no policies, so the
// browser's publishable key cannot write to the bucket at all. The function
// re-checks that the caller is an admin before using the service role.
// Reads are unaffected — the bucket is public, so the returned URL just works.
//
// Images are compressed in the browser first (see lib/image-compress.ts), so
// the bucket only ever receives display-sized files.

type MediaResponse = { path: string; publicUrl: string };

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

const uploadBlob = async (blob: Blob, name: string, folder: string): Promise<string> => {
  const compressed = await compressImage(blob, name);

  const form = new FormData();
  form.append('file', compressed.blob, compressed.name);
  form.append('folder', folder);

  const { publicUrl } = await invoke<MediaResponse>(form);
  return publicUrl;
};

export const StorageService = {
  uploadFile: async (file: File | Blob, folder: string = 'products'): Promise<string> => {
    const name = file instanceof File ? file.name : 'upload.jpg';
    return uploadBlob(file, name, folder);
  },

  /**
   * Pulls an image from an external URL through the Edge Function — the fetch
   * has to be server-side because image hosts do not send CORS headers — then
   * compresses and uploads it exactly like a picked file.
   */
  uploadFromUrl: async (url: string, folder: string = 'products'): Promise<string> => {
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

    return uploadBlob(new Blob([bytes], { type: mime }), name, folder);
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

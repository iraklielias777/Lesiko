// Admin-gated storage gateway.
//
// storage.objects carries RLS with no policies, so nothing but the service role
// can write to the `media` bucket. This function is the only holder of that key:
// it verifies the caller's JWT, checks their profile is an admin, and only then
// performs the operation. Reads never come through here — the bucket is public.
//
// Doing the URL fetch server-side is also the only way "add image by URL" can
// work at all, since arbitrary image hosts do not send CORS headers.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BUCKET = 'media';
const ALLOWED_FOLDERS = ['products', 'categories', 'brands', 'content'];

// Ceiling on what we will fetch from a remote host, before the browser
// compresses it.
const MAX_FETCH_BYTES = 25 * 1024 * 1024;

// Ceiling on what actually lands in the bucket. lib/image-compress.ts puts a
// 2000px WebP well under this, so anything still over it either dodged
// compression or is not really a photo, and would quietly eat storage.
const MAX_BYTES = 2 * 1024 * 1024;
const ONE_YEAR_SECONDS = 31536000;

/**
 * Every size the storefront can ask for. Mirrors IMAGE_WIDTHS in
 * lib/image-url.ts — the two must agree or the warm-up hits URLs nobody uses.
 */
const WARM_WIDTHS = [160, 320, 640, 1200];
const WARM_QUALITY = 75;
const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing authorization header' }, 401);

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return json({ error: 'Invalid or expired session' }, 401);

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') return json({ error: 'Admin access required' }, 403);
  return null;
}

const extensionFor = (mime: string, fallbackName?: string) => {
  const fromName = fallbackName?.includes('.')
    ? fallbackName.split('.').pop()!.toLowerCase()
    : '';
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
  };
  return map[mime] ?? 'jpg';
};

const safeFolder = (folder: unknown) =>
  typeof folder === 'string' && ALLOWED_FOLDERS.includes(folder) ? folder : 'products';

type RemoteImage = { blob: Blob; mime: string; name: string };

/** Returns a `Response` instead when the fetch should be reported as an error. */
async function fetchRemote(url: string): Promise<RemoteImage | Response> {
  let remote: Response;
  try {
    remote = await fetch(url, { redirect: 'follow' });
  } catch {
    return json({ error: 'Could not reach that URL' }, 400);
  }
  if (!remote.ok) return json({ error: `Source responded ${remote.status}` }, 400);

  const blob = await remote.blob();
  return {
    blob,
    mime: blob.type.split(';')[0].trim().toLowerCase() || 'application/octet-stream',
    name: new URL(url).pathname.split('/').pop() || 'image',
  };
}

/**
 * A transform that has never been requested costs ~2.5 s at the origin before
 * the CDN can serve it; the first shopper to open a product pays that for
 * every image on the page. Requesting the ladder once here, right after the
 * upload, means the CDN is already warm when the product is first viewed.
 * Fire-and-forget: the upload response does not wait for it.
 */
const warmTransforms = (publicUrl: string, fit: string) => {
  const resize = fit === 'cover' ? 'cover' : 'contain';
  const base = publicUrl.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
  const jobs = WARM_WIDTHS.map((w) =>
    fetch(`${base}?width=${w}&height=${w}&resize=${resize}&quality=${WARM_QUALITY}`, {
      headers: { Accept: 'image/avif,image/webp,*/*' },
    }).then((r) => r.body?.cancel()).catch(() => undefined),
  );
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(Promise.all(jobs));
};

async function store(blob: Blob, folder: string, originalName?: string, fit = 'contain') {
  // Remote hosts often return `image/jpeg; charset=binary`.
  const mime = blob.type.split(';')[0].trim().toLowerCase();

  if (!ALLOWED_MIME.includes(mime)) {
    return json({ error: `Unsupported file type: ${mime || 'unknown'}` }, 415);
  }
  // SVGs are vector text and compress on the wire; they are not the problem
  // this limit exists to solve.
  if (mime !== 'image/svg+xml' && blob.size > MAX_BYTES) {
    return json(
      {
        error:
          `Image is ${(blob.size / 1024 / 1024).toFixed(1)} MB after compression, ` +
          `over the ${MAX_BYTES / 1024 / 1024} MB limit. Try a smaller source image.`,
      },
      413,
    );
  }

  const ext = extensionFor(mime, originalName);
  const path = `${folder}/${crypto.randomUUID()}-${Date.now()}.${ext}`;

  const { error } = await admin.storage.from(BUCKET).upload(path, blob, {
    contentType: mime,
    // A year, not an hour. Every object here is content-addressed — a UUID plus
    // a timestamp — so its bytes can never change; replacing an image writes a
    // new path and the row is repointed at it. At the old `3600` every
    // returning visitor re-downloaded every product photo after an hour, and
    // the render endpoint inherits the object's value, so the resized variants
    // expired just as fast.
    cacheControl: `${ONE_YEAR_SECONDS}`,
    upsert: false,
  });
  if (error) return json({ error: error.message }, 500);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  if (folder === 'products') warmTransforms(data.publicUrl, fit);
  return json({ path, publicUrl: data.publicUrl });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const denied = await requireAdmin(req);
  if (denied) return denied;

  const contentType = req.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return json({ error: 'No file provided' }, 400);
      const fit = form.get('fit') === 'cover' ? 'cover' : 'contain';
      return await store(file, safeFolder(form.get('folder')), file.name, fit);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Invalid request body' }, 400);

    const { action, folder, url, path } = body as Record<string, string>;

    // Hands the bytes back to the browser so it can run them through the same
    // compressor as a picked file, then upload through the multipart path.
    // The fetch has to happen here because image hosts do not send CORS
    // headers.
    if (action === 'fetch-url') {
      if (!url) return json({ error: 'No url provided' }, 400);

      const remote = await fetchRemote(url);
      if (remote instanceof Response) return remote;

      if (remote.blob.size > MAX_FETCH_BYTES) {
        return json({ error: 'Source image is too large to fetch' }, 413);
      }

      return new Response(remote.blob, {
        headers: {
          ...CORS,
          // supabase-js only hands back a Blob for octet-stream, so the real
          // type travels in a header the client re-applies.
          'Content-Type': 'application/octet-stream',
          'X-Source-Content-Type': remote.mime,
          'X-Source-Filename': remote.name,
          'Access-Control-Expose-Headers': 'X-Source-Content-Type, X-Source-Filename',
        },
      });
    }

    // Kept as a fallback for callers that cannot compress locally.
    if (action === 'upload-from-url') {
      if (!url) return json({ error: 'No url provided' }, 400);

      const remote = await fetchRemote(url);
      if (remote instanceof Response) return remote;

      return await store(remote.blob, safeFolder(folder), remote.name);
    }

    // Warm the transform ladder for an object that already exists — used by
    // scripts/warm-images.mjs after the URL scheme changed under the cache.
    if (action === 'warm') {
      if (!url) return json({ error: 'No url provided' }, 400);
      warmTransforms(url, typeof body.fit === 'string' ? body.fit : 'contain');
      return json({ warming: url });
    }

    if (action === 'delete') {
      if (!path) return json({ error: 'No path provided' }, 400);
      const { error } = await admin.storage.from(BUCKET).remove([path]);
      if (error) return json({ error: error.message }, 500);
      return json({ deleted: path });
    }

    return json({ error: `Unknown action: ${action ?? 'none'}` }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});

-- Storage bucket backing every image upload in the admin (StorageService
-- writes to media/{products,categories,brands,content}/ and serves the
-- resulting public URL straight into the catalogue rows).
--
-- No storage.objects policies are declared here: the migration runner connects
-- as `postgres`, which does not own storage.objects and therefore cannot create
-- them. Writes go through the `media` Edge Function, which holds the service
-- role key and bypasses RLS after checking the caller is an admin. Reads need
-- no policy because the bucket is public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760, -- 10 MB
  array['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/avif','image/svg+xml']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

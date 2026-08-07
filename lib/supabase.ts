import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const isConfigured = !!supabaseUrl && !!supabasePublishableKey;

if (!isConfigured) {
  console.error(
    'Supabase is not configured. Copy .env.example to .env.local and set ' +
    'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart the dev server.'
  );
}

export const SUPABASE_URL: string = supabaseUrl ?? '';
export const SUPABASE_PUBLISHABLE_KEY: string = supabasePublishableKey ?? '';

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (null as any);

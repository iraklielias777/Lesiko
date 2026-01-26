
import { createClient } from '@supabase/supabase-js';

// Use provided project credentials
const supabaseUrl = 'https://lmuoxqkmecppwndnfsve.supabase.co';
const supabaseAnonKey = 'sb_publishable_hCH_0fNZNUTvAgqIHnxKlw_qhuw0vZF';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

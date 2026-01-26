
import { createClient } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = 'https://lmuoxqkmecppwndnfsve.supabase.co';
const supabaseAnonKey = 'sb_publishable_hCH_0fNZNUTvAgqIHnxKlw_qhuw0vZF';

const isConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isConfigured) {
  console.warn('Supabase credentials missing. Some features will not work.');
}

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : (null as any);

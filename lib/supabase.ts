
import { createClient } from '@supabase/supabase-js';

// Note: In a real Vite environment, these come from import.meta.env
// For this environment, we use process.env mapping
const supabaseUrl = (window as any).process?.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (window as any).process?.env?.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. App will use fallback mock mode.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

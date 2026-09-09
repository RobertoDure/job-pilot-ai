import { createClient } from '@supabase/supabase-js';

// Client-safe publishable key (safe to expose in the browser).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zvbqsdztecgosqsxqaxf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_xWaBpxHrVBHCYXlgh75uww_oVFYnClk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

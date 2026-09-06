import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './config';

// Server-side client for verifying user JWTs (uses the publishable key).
let admin: SupabaseClient | null = null;
export function getAdminClient(): SupabaseClient {
  if (!admin) {
    admin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

// Server-side client using the service-role key (bypasses RLS). Used only for
// shared catalog writes such as ingesting real jobs. Returns null when the key
// is not configured.
let service: SupabaseClient | null = null;
export function getServiceClient(): SupabaseClient | null {
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!service) {
    service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return service;
}

// Client that sends the user's access token so Row Level Security scopes
// every query to that user's own rows.
export function getUserClient(jwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: 'Bearer ' + jwt } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

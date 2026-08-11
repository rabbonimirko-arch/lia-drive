import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';
let adminClient: SupabaseClient | null | undefined;
let publicClient: SupabaseClient | null | undefined;
export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  const config = getConfig();
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    adminClient = null;
    return adminClient;
  }
  adminClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}
export function getSupabasePublic(): SupabaseClient | null {
  if (publicClient !== undefined) return publicClient;
  const config = getConfig();
  if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY) {
    publicClient = null;
    return publicClient;
  }
  publicClient = createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return publicClient;
}
export function resetSupabaseForTests(): void {
  adminClient = undefined;
  publicClient = undefined;
}

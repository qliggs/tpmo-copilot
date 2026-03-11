// Supabase clients for TPMO Copilot
// - supabase:      browser / API route client (anon key, respects RLS)
// - supabaseAdmin: server-only client (service role key, bypasses RLS)
//
// Clients are created lazily so the app doesn't crash at import time
// when env vars are missing (e.g., during build or local dev without Supabase).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Lazy singletons
// ---------------------------------------------------------------------------

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

/** Browser + API route client -- uses anon key, respects RLS. */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    if (!url || !anonKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
    }

    _supabase = createClient(url, anonKey);
  }
  return _supabase;
}

/** Server-only admin client -- uses service role key, bypasses RLS. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

    if (!url || !serviceRoleKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      );
    }

    _supabaseAdmin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

// Convenience aliases for backward compatibility
export { getSupabase as supabase };
export { getSupabaseAdmin as supabaseAdmin };

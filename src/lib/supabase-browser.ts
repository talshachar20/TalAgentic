import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton for client-side use (anon key only).
let _client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required."
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}

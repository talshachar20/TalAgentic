import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — not initialized at module load time.
// Avoids build failures when env vars are absent during `next build`.
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    // Use non-NEXT_PUBLIC_ vars for server-side code — Next.js does NOT
    // statically replace these at build time, so they are read correctly
    // from the container environment at runtime.
    const url = process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing Supabase env vars: SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required."
      );
    }
    _client = createClient(url, key);
  }
  return _client;
}

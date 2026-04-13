import { createClient } from "@supabase/supabase-js";

// Client-side Supabase instance — anon key only (safe to expose in browser)
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

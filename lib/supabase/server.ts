import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-side client for Server Components / route handlers. Uses the same
// publishable key for now; swap to a cookie-aware SSR client once the admin
// login flow (Phase 1) needs an authenticated session.
export function createServerSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Browser-side client. Safe to use in Client Components — the publishable
// key only grants what Row Level Security policies allow.
export function createBrowserSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

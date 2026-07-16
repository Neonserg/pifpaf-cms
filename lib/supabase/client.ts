import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Browser-side client for Client Components. Session lives in cookies so it
// stays in sync with the server client below.
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

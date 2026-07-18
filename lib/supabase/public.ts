import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cookie-less anon client for PUBLIC reads only. The cookie-bound client in
// server.ts calls next/headers cookies(), which opts every route that uses it
// into dynamic rendering — that would make the whole public site uncacheable.
// Public data is readable by anon RLS policies, so no session is needed; using
// this client keeps public pages eligible for static/ISR caching.
//
// Never use this for admin reads or any write that relies on the visitor's
// session — use createServerSupabaseClient / requireAdminClient for those.
export function createPublicSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

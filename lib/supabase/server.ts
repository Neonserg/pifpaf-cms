import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Server-side client for Server Components, Server Actions and Route
// Handlers. Reads/writes the auth session via Next.js cookies, so
// `auth.getUser()` reflects whoever is actually logged in.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component that can't set cookies (e.g. a
            // page render). Safe to ignore — middleware refreshes the
            // session on every request instead.
          }
        },
      },
    }
  );
}

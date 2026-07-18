import { createServerSupabaseClient } from "./server";

/**
 * Returns an authenticated server client, or throws if nobody is logged in.
 *
 * Next.js Server Actions are public POST endpoints that can be dispatched from
 * *any* route, so the `/admin/:path*` middleware matcher in `proxy.ts` does not
 * protect them on its own — an action invoked against a public route skips that
 * matcher entirely. Every privileged action must therefore verify the session
 * itself. This is defense-in-depth: Supabase RLS remains the last line, but the
 * app should never rely on RLS alone.
 */
export async function requireAdminClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

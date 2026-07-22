import { getSession, type SessionPayload } from "./session";

/**
 * Returns the verified admin session, or throws if nobody is logged in.
 *
 * Next.js Server Actions are public POST endpoints that can be dispatched from
 * *any* route, so the `/admin/:path*` middleware matcher in `proxy.ts` does not
 * protect them on its own — an action invoked against a public route skips that
 * matcher entirely. Every privileged action must therefore verify the session
 * itself. This is defense-in-depth, not the only check.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "./session";

// Bounces unauthenticated visitors away from /admin/* (except the login page itself).
export async function updateSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!session && !isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (session && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/pages";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next({ request });
}

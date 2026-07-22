import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

// Next.js 16 renamed `middleware` -> `proxy` (nodejs runtime, not configurable).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image
     * - favicon / icons / manifest / service worker
     * - files with an extension (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

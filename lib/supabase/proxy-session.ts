import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/** Routes that require an authenticated user. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/friends",
  "/events",
  "/notifications",
  "/settings",
];

const AUTH_PAGES = ["/sign-in", "/sign-up"];

/**
 * Refreshes the Supabase session on every request (so Server Components always
 * see a fresh token) and gates protected routes on authentication only.
 *
 * The "has this user finished onboarding?" check used to live here too, which
 * meant a second Supabase round-trip on *every* navigation. That check now runs
 * once in the `(app)` segment via `requireProfile()`, keeping Proxy fast.
 *
 * Called from the root `proxy.ts`.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between createServerClient and getClaims().
  //
  // getClaims() verifies the access-token JWT *locally* via WebCrypto when the
  // project uses an asymmetric signing key (Auth -> JWT Keys) — no network call.
  // It still refreshes the session cookie when the token is close to expiry.
  // Falls back to a getUser()-style network check if the project is still on the
  // legacy symmetric secret, so this is safe to ship before migrating keys.
  const { data } = await supabase.auth.getClaims();
  const isAuthed = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  if (!isAuthed && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthed && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

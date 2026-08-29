import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Server-side Supabase client for Server Components, Route Handlers and
 * Server Actions. Reads/writes the auth cookies via `next/headers`.
 *
 * In a Server Component the cookie `set` calls throw (read-only store); that is
 * expected and swallowed — session refresh there is handled by `proxy.ts`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore.
          }
        },
      },
    },
  );
}

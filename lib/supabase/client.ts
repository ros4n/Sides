import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Browser-side Supabase client. Safe to call in Client Components.
 * Auth state is persisted in cookies so the server can read it too.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

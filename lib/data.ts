import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;
export type EventRow = Tables<"events">;
export type EventMember = Tables<"event_members">;

/** Minimal authenticated-user shape derived from the verified JWT claims. */
export type AuthUser = { id: string; email: string | null };

/**
 * The signed-in auth user (from the verified JWT claims), or null.
 *
 * Uses `getClaims()` rather than `getUser()`: with an asymmetric JWT signing
 * key the token is verified locally with no call to the Auth server.
 */
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return claims?.sub
    ? { id: claims.sub, email: (claims.email as string | undefined) ?? null }
    : null;
});

/** Signed-in user + profile, redirecting to sign-in / onboarding as needed. */
export const requireProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/sign-in");

  const user: AuthUser = {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.username) redirect("/onboarding");
  return { user, profile: profile as Profile, supabase };
});

/**
 * One event by id, deduped across `generateMetadata` and the page body within a
 * single request so the row is fetched once, not twice.
 */
export const getEventById = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
});

export async function getUnreadNotificationCount() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

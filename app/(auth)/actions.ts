"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credsSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  next: z.string().optional(),
});

export type AuthState = { error?: string } | undefined;

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  redirect(safeNext(parsed.data.next));
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: error.message };

  // If email confirmation is on, there is no session yet.
  if (!data.session) {
    return {
      error:
        "Check your email to confirm your account, then sign in. (Local dev: confirmation is disabled.)",
    };
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

function safeNext(next?: string) {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

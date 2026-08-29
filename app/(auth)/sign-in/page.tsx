import type { Metadata } from "next";
import { AuthForm } from "../_form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return <AuthForm mode="sign-in" next={next} />;
}

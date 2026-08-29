import type { Metadata } from "next";
import { AuthForm } from "../_form";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage({
  searchParams,
}: PageProps<"/sign-up">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return <AuthForm mode="sign-up" next={next} />;
}

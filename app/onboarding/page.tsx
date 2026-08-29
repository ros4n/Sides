import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OnboardingForm } from "./_form";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.username) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Card stapled className="p-1">
          <CardHeader>
            <p className="tab -ml-4 -mt-4 mb-2 inline-block px-3 py-1 text-micro tracking-[0.16em]">
              Your player card
            </p>
            <CardTitle className="text-3xl">Fill this in</CardTitle>
            <CardDescription>
              A name and a photo so the crew knows who they&apos;re passing to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm email={user.email ?? ""} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

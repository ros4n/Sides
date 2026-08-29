import type { Metadata } from "next";
import { requireProfile } from "@/lib/data";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PushToggle } from "@/components/app/push-toggle";
import { ProfileForm } from "./_profile-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await requireProfile();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="zine-head text-4xl sm:text-5xl">Small print</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear to friends and in games.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            username={profile.username ?? ""}
            displayName={profile.display_name ?? ""}
            avatarUrl={profile.avatar_url}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            In-app notifications are always on. Add background push per device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushToggle />
        </CardContent>
      </Card>
    </div>
  );
}

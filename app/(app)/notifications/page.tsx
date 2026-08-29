import type { Metadata } from "next";
import { NotificationsPageClient } from "@/components/app/notifications-page-client";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="space-y-5">
      <h1 className="zine-head text-4xl sm:text-5xl">Stop press</h1>
      <NotificationsPageClient />
    </div>
  );
}

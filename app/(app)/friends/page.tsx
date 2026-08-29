import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { shapeFriendships, type ProfileLite } from "@/lib/friends";
import { FriendsClient } from "@/components/friends/friends-client";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const { user } = await requireProfile();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("friendships")
    .select("*")
    .neq("status", "blocked")
    .order("updated_at", { ascending: false });

  const friendships = rows ?? [];
  const otherIds = friendships.map((r) =>
    r.user_low === user.id ? r.user_high : r.user_low,
  );

  const profiles = new Map<string, ProfileLite>();
  if (otherIds.length) {
    const { data: ps } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", otherIds);
    for (const p of ps ?? []) profiles.set(p.id, p);
  }

  const shaped = shapeFriendships(friendships, profiles, user.id);
  const friends = shaped.filter((f) => f.status === "accepted");
  const incoming = shaped.filter(
    (f) => f.status === "pending" && f.direction === "incoming",
  );
  const outgoing = shaped.filter(
    (f) => f.status === "pending" && f.direction === "outgoing",
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="zine-head text-4xl sm:text-5xl">The crew</h1>
        <p className="text-muted">
          Your network — this is who you can pull into a game.
        </p>
      </div>
      <FriendsClient
        meId={user.id}
        initialFriends={friends}
        initialIncoming={incoming}
        initialOutgoing={outgoing}
      />
    </div>
  );
}

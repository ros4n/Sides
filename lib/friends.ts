import type { Tables } from "@/lib/supabase/database.types";

export type Friendship = Tables<"friendships">;
export type ProfileLite = Pick<
  Tables<"profiles">,
  "id" | "username" | "display_name" | "avatar_url"
>;

export type FriendEntry = {
  friendshipId: string;
  status: Friendship["status"];
  other: ProfileLite;
  direction: "incoming" | "outgoing" | "mutual";
};

export function shapeFriendships(
  rows: Friendship[],
  profiles: Map<string, ProfileLite>,
  meId: string,
): FriendEntry[] {
  return rows.flatMap((r) => {
    const otherId = r.user_low === meId ? r.user_high : r.user_low;
    const other = profiles.get(otherId);
    if (!other) return [];
    const direction =
      r.status === "accepted"
        ? ("mutual" as const)
        : r.requested_by === meId
          ? ("outgoing" as const)
          : ("incoming" as const);
    return [{ friendshipId: r.id, status: r.status, other, direction }];
  });
}

export function displayName(p: ProfileLite) {
  return p.display_name || p.username || "Player";
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  display_name: z.string().trim().min(1).max(50),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, "3–20 letters, numbers or underscores"),
});

export type SettingsState = { error?: string; ok?: boolean } | undefined;

export async function updateProfileAction(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  let avatarUrl: string | undefined;
  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) return { error: "Avatar must be under 2 MB" };
    if (!file.type.startsWith("image/")) return { error: "Avatar must be an image" };
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) return { error: `Avatar upload failed: ${upErr.message}` };
    avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      username: parsed.data.username,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "That username is taken" };
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

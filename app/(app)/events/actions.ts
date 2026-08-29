"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Give the game a name").max(120),
  venue: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  starts_at: z.string().min(1, "Pick a date and time"),
  duration_min: z.coerce.number().int().min(15).max(600),
  team_count: z.coerce.number().int().min(2).max(8),
  players_per_team: z.coerce.number().int().min(1).max(15),
  visibility: z.enum(["invite_only", "friends", "public"]),
});

export type EventFormState = { error?: string; ok?: boolean } | undefined;

export async function createEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  }
  const d = parsed.data;
  const startsAt = new Date(d.starts_at);
  if (Number.isNaN(startsAt.getTime())) return { error: "Invalid start time" };

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      creator_id: user.id,
      title: d.title,
      venue: d.venue || null,
      description: d.description || null,
      starts_at: startsAt.toISOString(),
      duration_min: d.duration_min,
      team_count: d.team_count,
      players_per_team: d.players_per_team,
      visibility: d.visibility,
    })
    .select("id")
    .single();

  if (error || !event) return { error: error?.message ?? "Could not create event" };

  revalidatePath("/dashboard");
  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

const updateSchema = eventSchema.partial().extend({ id: z.string().uuid() });

export async function updateEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const supabase = await createClient();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };
  const { id, starts_at, venue, description, ...rest } = parsed.data;

  const patch: TablesUpdate<"events"> = { ...rest };
  if (starts_at) patch.starts_at = new Date(starts_at).toISOString();
  if (venue !== undefined) patch.venue = venue || null;
  if (description !== undefined) patch.description = description || null;

  const { error } = await supabase.from("events").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/events/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setEventStatusAction(id: string, status: "scheduled" | "live" | "done" | "cancelled") {
  const supabase = await createClient();
  const { error } = await supabase.from("events").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/events/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteEventAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  revalidatePath("/dashboard");
  redirect("/events");
}

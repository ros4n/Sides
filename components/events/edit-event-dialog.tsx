"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { Tables } from "@/lib/supabase/database.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/misc";
import { toDatetimeLocalValue } from "@/lib/format";
import { updateEventAction, type EventFormState } from "@/app/(app)/events/actions";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function EditEventDialog({ event }: { event: Tables<"events"> }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<EventFormState, FormData>(
    updateEventAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Game updated");
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit game</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={event.id} />
          <div className="space-y-1.5">
            <Label htmlFor="e-title">Name</Label>
            <Input id="e-title" name="title" defaultValue={event.title} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-starts">Date &amp; time</Label>
              <Input
                id="e-starts"
                name="starts_at"
                type="datetime-local"
                defaultValue={toDatetimeLocalValue(event.starts_at)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-dur">Duration (min)</Label>
              <Input
                id="e-dur"
                name="duration_min"
                type="number"
                min={15}
                max={600}
                step={15}
                defaultValue={event.duration_min}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-venue">Venue</Label>
            <Input id="e-venue" name="venue" defaultValue={event.venue ?? ""} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-teams">Teams</Label>
              <Input
                id="e-teams"
                name="team_count"
                type="number"
                min={2}
                max={8}
                defaultValue={event.team_count}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-ppt">Players / team</Label>
              <Input
                id="e-ppt"
                name="players_per_team"
                type="number"
                min={1}
                max={15}
                defaultValue={event.players_per_team}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-vis">Visibility</Label>
            <select
              id="e-vis"
              name="visibility"
              defaultValue={event.visibility}
              className="h-10 w-full rounded-[calc(var(--radius)-2px)] border border-border bg-surface px-3 text-sm"
            >
              <option value="invite_only">Invite only</option>
              <option value="friends">Friends</option>
              <option value="public">Public</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-desc">Notes</Label>
            <Textarea id="e-desc" name="description" defaultValue={event.description ?? ""} />
          </div>
          <FieldError>{state?.error}</FieldError>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Save />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

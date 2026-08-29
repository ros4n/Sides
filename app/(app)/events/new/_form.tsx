"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock, UserCheck, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/misc";
import { toDatetimeLocalValue } from "@/lib/format";
import { createEventAction, type EventFormState } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Printing…" : "Start the game"}
    </Button>
  );
}

const visOptions = [
  { value: "invite_only", icon: Lock, title: "Crew only", desc: "Only people you add can see it or find it." },
  { value: "friends", icon: UserCheck, title: "Friends", desc: "Any of your friends can see it and ask in." },
  { value: "public", icon: Globe, title: "Open", desc: "Anyone with the link can see it." },
];

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <Label>{label}</Label>
      {children}
    </label>
  );
}

export function NewEventForm() {
  const [state, formAction] = useActionState<EventFormState, FormData>(
    createEventAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Game name">
        <Input name="title" required placeholder="Tuesday 7s" maxLength={120} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Date & time">
          <Input
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocalValue()}
          />
        </Field>
        <Field label="Minutes">
          <Input name="duration_min" type="number" defaultValue={60} min={15} max={600} step={15} />
        </Field>
      </div>

      <Field label="Venue">
        <Input name="venue" placeholder="Goals Docklands — pitch 3" maxLength={200} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Teams">
          <Input name="team_count" type="number" defaultValue={2} min={2} max={8} />
        </Field>
        <Field label="Players per team">
          <Input name="players_per_team" type="number" defaultValue={5} min={1} max={15} />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea
          name="description"
          placeholder="Dark and light shirt. £6 each, pay on the night."
          maxLength={2000}
        />
      </Field>

      <fieldset className="space-y-2">
        <legend>
          <Label>Who can see it</Label>
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {visOptions.map((o, i) => (
            <label
              key={o.value}
              className="flex cursor-pointer flex-col gap-1 border-2 border-ink bg-paper-2 p-2.5 transition-colors has-[:checked]:bg-riso has-[:checked]:text-riso-ink"
            >
              <input
                type="radio"
                name="visibility"
                value={o.value}
                defaultChecked={i === 0}
                className="sr-only"
              />
              <span className="flex items-center gap-1.5 font-display text-note font-extrabold uppercase tracking-wide">
                <o.icon className="size-4" /> {o.title}
              </span>
              <span className="font-mono text-mini opacity-80">{o.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <FieldError>{state?.error}</FieldError>
      <Submit />
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { FieldError } from "@/components/ui/misc";
import { completeProfileAction, type OnboardingState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Saving…" : "Continue"}
    </Button>
  );
}

export function OnboardingForm({ email }: { email: string }) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    completeProfileAction,
    undefined,
  );
  const [username, setUsername] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar
          name={username || email}
          src={preview}
          size={64}
          className="ring-2 ring-border"
        />
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            {preview ? "Change photo" : "Add photo"}
          </Button>
          <p className="mt-1 text-xs text-muted">PNG or JPG, up to 2 MB.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          name="avatar"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
          placeholder="pele10"
          pattern="[a-zA-Z0-9_]{3,20}"
        />
        <p className="text-xs text-muted">
          This is how friends find and add you.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="display_name">Display name (optional)</Label>
        <Input id="display_name" name="display_name" placeholder="Diego" maxLength={50} />
      </div>

      <FieldError>{state?.error}</FieldError>
      <SubmitButton />
    </form>
  );
}

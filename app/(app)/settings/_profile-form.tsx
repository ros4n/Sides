"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/misc";
import { updateProfileAction, type SettingsState } from "./actions";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function ProfileForm({
  username,
  displayName,
  avatarUrl,
}: {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const [state, action] = useActionState<SettingsState, FormData>(
    updateProfileAction,
    undefined,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(displayName);

  useEffect(() => {
    if (state?.ok) toast.success("Profile updated");
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar name={name || username} src={preview ?? avatarUrl} size={64} />
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            Change photo
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            name="display_name"
            required
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            required
            defaultValue={username}
            pattern="[a-zA-Z0-9_]{3,20}"
          />
        </div>
      </div>

      <FieldError>{state?.error}</FieldError>
      <Save />
    </form>
  );
}

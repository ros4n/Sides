"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function JoinInviteBanner({
  inviteId,
  role,
}: {
  inviteId: string;
  role: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function respond(accept: boolean) {
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("respond_event_invite", {
        _invite: inviteId,
        _accept: accept,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(accept ? "You're in" : "Invite declined");
      if (accept) router.refresh();
      else router.push("/dashboard");
    });
  }

  return (
    <div className="clip taped flex flex-wrap items-center justify-between gap-3 border-2 border-riso p-3 pt-5">
      <p className="font-sans text-note">
        <span className="mr-2 border-2 border-ink bg-riso px-1.5 font-display text-micro font-extrabold uppercase tracking-widest text-riso-ink">
          You&apos;re invited
        </span>
        to join as a <strong className="uppercase">{role}</strong>.
      </p>
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => respond(true)}>
          I&apos;m in
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => respond(false)}>
          No thanks
        </Button>
      </div>
    </div>
  );
}

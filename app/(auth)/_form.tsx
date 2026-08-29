"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldError } from "@/components/ui/misc";
import { signInAction, signUpAction, type AuthState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "One sec…" : label}
    </Button>
  );
}

export function AuthForm({
  mode,
  next,
}: {
  mode: "sign-in" | "sign-up";
  next?: string;
}) {
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  const isSignIn = mode === "sign-in";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {isSignIn ? "Sign back in" : "Sign yourself up"}
        </CardTitle>
        <CardDescription>
          {isSignIn
            ? "Your crew's games are behind this page."
            : "Email and a password. That's the whole form."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignIn ? "current-password" : "new-password"}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
          <FieldError>{state?.error}</FieldError>
          <SubmitButton label={isSignIn ? "Sign in" : "Sign up"} />
        </form>

        <p className="mt-4 text-center font-mono text-note text-ink-soft">
          {isSignIn ? (
            <>
              First time?{" "}
              <Link href="/sign-up" className="font-bold text-riso underline underline-offset-4">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Been here before?{" "}
              <Link href="/sign-in" className="font-bold text-riso underline underline-offset-4">
                Sign in
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

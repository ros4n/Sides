"use client";

import Link from "next/link";
import { LogOut, Settings, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { signOutAction } from "@/app/(auth)/actions";

export function UserMenu({
  name,
  username,
  avatarUrl,
}: {
  name: string;
  username: string;
  avatarUrl: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-riso"
          aria-label="Your player card"
        >
          <Avatar name={name} src={avatarUrl} size={34} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-mono text-sm font-bold text-ink">{name}</div>
          <div className="font-mono text-mini text-ink-soft">@{username}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/friends">
            <Users /> The crew
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings /> Small print
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="focus:bg-alarm focus:text-ink"
          onSelect={(e) => {
            e.preventDefault();
            void signOutAction();
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

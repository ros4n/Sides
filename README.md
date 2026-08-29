# Sides

A PWA + website for organising private futsal games:

1. **Live team shuffling** — drag players between teams on a board that updates in real time for
   everyone watching; anyone granted `can_shuffle` can reshuffle.
2. **Private by default** — every game is invite-only. People who aren't on the list can't see it,
   find it, list it, or open it (enforced by Postgres Row-Level Security, not just the UI).
3. **Friend network** — add people by username; organisers pull players into a specific game from
   that list.
4. **Notifications** — invites, roster changes, live reshuffles and "starting soon" reminders, both
   in-app (toasts + feed) and as background **Web Push**.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — one codebase serves the marketing site and
  the installable PWA.
- **Supabase** — Postgres + RLS, Realtime (Broadcast + Postgres Changes + Presence), Auth
  (email + password), Storage (avatars), Edge Functions (`send-push`, `event-reminders`), `pg_cron`.
- Tailwind v4 + Radix primitives, `@dnd-kit` for the shuffle board, hand-written service worker
  (`public/sw.js`) for offline shell + push.

## Local development

Prerequisites: Node 20+, Docker Desktop running.

```bash
npm install
npx supabase start          # boots the local Postgres/Auth/Realtime/Storage stack
npx supabase db reset       # applies supabase/migrations/*
cp .env.example .env.local  # then paste the keys printed by `supabase start`
node scripts/seed.mjs       # optional: 4 demo users (password: password123) + friendships
npm run dev                 # http://localhost:3000
```

Edge functions (for Web Push + reminders locally):

```bash
cp supabase/functions/.env.example supabase/functions/.env   # add your VAPID keys
npx supabase functions serve --env-file supabase/functions/.env --no-verify-jwt
```

Generate VAPID keys once with `npx web-push generate-vapid-keys` and put them in **both**
`.env.local` (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`) and
`supabase/functions/.env`.

### Handy scripts

| Command | Does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:start` / `db:stop` / `db:reset` | local Supabase |
| `npm run db:types` | regenerate `lib/supabase/database.types.ts` from the local DB |
| `node scripts/gen-icons.mjs` | rebuild PWA icons from `scripts/gen-icons.mjs` |

## How the pieces fit

| Concern | Where |
|---|---|
| Session refresh + route gating | `proxy.ts` → `lib/supabase/proxy-session.ts` (Next 16 renamed middleware → proxy) |
| Server / browser / admin Supabase clients | `lib/supabase/{server,client,admin}.ts` |
| Privacy | `events` SELECT policy + `can_view_event()` / `has_pending_invite()` helpers (`supabase/migrations/…_events.sql`, `…_pending_invite_helper.sql`) |
| Shuffle correctness | `commit_shuffle()` / `auto_shuffle()` RPCs with a `version` counter + soft editor lock (`…_team_assignments.sql`) |
| Live board | `components/board/shuffle-board.tsx` — Broadcast for drag feel, Postgres Changes as source of truth, Presence for viewers. Collaborative cues: a presence avatar stack (active editor gets a coloured pulsing ring), a "**X is shuffling teams…**" activity bar, and per-player "held by X" outlines + name badges while someone is dragging that chip. |
| In-app notifications | `components/app/notifications-store.tsx` (one Realtime subscription, shared via context) |
| Web Push | client subscribe in `lib/push.ts` → `save_push_subscription` RPC → `notifications` INSERT trigger → `net.http_post` → `supabase/functions/send-push` |
| Reminders | `send_due_event_reminders()` on a `pg_cron` `*/5 * * * *` schedule (also callable via the `event-reminders` function) |

## Deploy

1. Create a Supabase project. `supabase link` then `supabase db push`.
2. `supabase functions deploy send-push event-reminders` and
   `supabase secrets set --env-file supabase/functions/.env`.
3. In the Supabase SQL editor set the push-dispatch target for the trigger:
   `alter database postgres set "app.settings.edge_base_url" = 'https://<ref>.supabase.co/functions/v1';`
   `alter database postgres set "app.settings.service_role_key" = '<service-role-key>';`
4. Deploy the Next.js app (e.g. Vercel) with the `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`,
   `*_VAPID_*` and `NEXT_PUBLIC_SITE_URL` env vars. The service worker only registers in production.

> iOS Web Push needs iOS 16.4+ **and** the PWA added to the Home Screen. In-app notifications cover
> the gap everywhere else.

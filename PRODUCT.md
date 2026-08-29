# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are **casual pickup futsal crews** — groups of friends or coworkers who play
regular informal 5-a-side (e.g. a standing "Tuesday 7s"). They have no club, league, or
dedicated organiser; whoever books the pitch that week runs it. They organise almost entirely
on a phone, in spare moments between work and kickoff: confirming who's in, splitting sides,
chasing stragglers. Anyone in the crew may be the organiser on any given week.

## Product Purpose

Replace the group-chat chaos of organising a casual futsal game. The product lets anyone spin
up a game, invite a specific set of people, build balanced teams together on a board that
updates live for everyone allowed to watch, and keep the right people notified — without the
game, its details, or even its existence leaking to anyone who wasn't invited. Success is a
crew that stops arguing in a chat thread and shows up to balanced teams.

## Positioning

Two things a neighbouring "team generator" or scheduling app could not truthfully copy at once:

1. **Privacy is structural, not a setting.** Every game is invite-only by default and access is
   enforced at the database (row-level security), so a non-invited person cannot see, search,
   list, or open a game — it does not exist for them.
2. **Team-building is a live, shared, permissioned act.** Multiple trusted people can reshuffle
   the same board in real time; everyone invited watches it move, and you can see exactly who
   is dragging whom right now.

## Operating Context

- Used on phones, one-handed, in short bursts — walking to the pitch, on a break, on the bus.
- A game has a time, a venue, a team count and size, and a roster split between the unassigned
  pool and N teams.
- Roles per game: **admin** (the creator and anyone they promote), **player** (on the board),
  **watcher** (sees the game and board, never on a team). Admins grant `can_shuffle` and
  `can_invite` per person.
- A friend network is the source of people: you add someone once by username, then pull them
  into specific games.
- Notifications matter because the failure mode is someone not knowing a game exists or that
  it moved: invites, being added, live reshuffles, detail changes, and "starting soon".

## Capabilities and Constraints

- **Installable PWA + website** from one codebase; must work offline enough to show a useful
  shell and must be usable as a home-screen app.
- **Auth:** email + password only. Identity in the UI is a unique **username** plus an
  **avatar**; there is no real name requirement.
- **Real-time** team board (drag between teams, auto-shuffle, per-player "who's holding this"
  presence), backed by an authoritative version counter and a soft editor lock.
- **Notifications:** in-app feed + toasts always; background Web Push per device (iOS needs
  16.4+ and the PWA added to the Home Screen — the design must account for a degraded path
  there).
- Surfaces today: marketing/landing site, sign-in / sign-up / onboarding, dashboard, events
  list, create-event, event detail (roster + permissions + invites), live shuffle board,
  notifications feed, settings (profile + push).
- Terminology: "game" and "event" are used interchangeably in the product; prefer **game** in
  user-facing copy.

## Brand Commitments

Name: **Sides** (chosen 2026-08-30; replaces the "Futsal Manager" placeholder). It names the
core act — picking sides. Wordmark is set in the display face (Staatliches) inside a riso-blue
block. Tone: a crew of mates, blunt and functional, never a corporate sports SaaS. Visual
identity is "The Team Sheet Zine" (see DESIGN.md).

## Evidence on Hand

Pre-launch. No real users, crews, venues, logos, testimonials, or usage data. Local demo seed
users exist for development only (`scripts/seed.mjs`). Future work must not fabricate
customers, numbers, or social proof.

## Product Principles

1. **Invisible by default.** The safe assumption is that a game is private; visibility is
   something you deliberately widen, never something you remember to close.
2. **Anyone can run it.** No permanent organiser role — the person with the pitch this week
   gets full control of that game with zero setup.
3. **The board is the product.** Team-building is the moment that matters; it should feel
   live, shared, and legible about who is doing what.
4. **Phone-first, glanceable.** Every core action is reachable one-handed; the common case is
   a 20-second check, not a session.
5. **Tell the right people, only them.** Notification reach follows the same invite list as
   visibility — no broadcast, no leaks.

## Accessibility & Inclusion

No product-specific standard established beyond general good practice: usable one-handed on a
phone, legible outdoors/low-light (dark mode is a real usage scene), drag interactions need a
non-drag fallback path, and colour is never the only carrier of meaning (team identity,
"who's shuffling").

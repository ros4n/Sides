---
name: Sides
description: A crew's private kickabout, run like a photocopied grassroots-football fanzine.
colors:
  paper: "#efe7d6"
  paper-2: "#e5dbc2"
  ink: "#1c1813"
  ink-soft: "#5c5347"
  rule: "#c7bda2"
  riso: "#2f39d6"
  riso-ink: "#f4efe0"
  alarm: "#ff2d7a"
  paper-dark: "#17140f"
  paper-2-dark: "#211d15"
  ink-dark: "#efe7d6"
  ink-soft-dark: "#a89d86"
  rule-dark: "#3b3529"
  riso-dark: "#5a63ff"
  riso-ink-dark: "#0d0b07"
  alarm-dark: "#ff4d8f"
typography:
  display:
    fontFamily: "Staatliches, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 13vw, 4rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0.015em"
    wordSpacing: "0.16em"
  body:
    # Running text + UI chrome. Readable at the small sizes where the
    # typewriter face fell apart.
    fontFamily: "Archivo, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  data:
    # Team sheets, the fixtures table, name-slips and field-data rows
    # (date / venue / format) — the typewriter carries the "roster" meaning here.
    fontFamily: "'Courier Prime', ui-monospace, 'Courier New', monospace"
    fontSize: "0.9rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Staatliches, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.14em"
  annotation:
    fontFamily: "Caveat, ui-rounded, cursive"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
rounded:
  edge: "3px"
  square: "0px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.riso}"
    textColor: "{colors.riso-ink}"
    typography: "{typography.display}"
    rounded: "{rounded.edge}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.edge}"
    padding: "0 16px"
    height: "40px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.edge}"
    padding: "0 16px"
    height: "40px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0 4px"
    height: "40px"
  card:
    backgroundColor: "{colors.paper-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.edge}"
    padding: "16px"
  badge:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "2px 6px"
  tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "6px 12px"
  team-sheet-header:
    backgroundColor: "{colors.riso}"
    textColor: "{colors.riso-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "4px 8px"
---

# Design System: Sides

## Overview

**Creative North Star — "The Team Sheet Zine."** The whole product is one issue of a
photocopied grassroots-football fanzine, cut and pasted on a kitchen table. It refuses the
clean SaaS dashboard and the literal magnetic tactics board that a football tool is expected
to reach for. Voice: a crew of mates, blunt and functional, never corporate, never twee.

The surface is **grained photocopy paper** — warm cream by day, dark pulp at night — carrying
**one riso blue** in flat blocks (30–60% of most screens), **black toner ink** for every word
of data, and a **fluoro-pink alarm reserved strictly for what is LIVE right now**. Ornament is
functional only: a corner staple, a strip of masking tape on a pinned game, a rubber stamp
that *is* the visibility control, a hand-drawn team number. Anti-reference: the SaaS card grid,
pitch-green accents, friendly rounded illustration, neon-on-black "sporty" tech.

## Colors

Strategy: **Committed.** Riso blue (`#2f39d6` light / `#5a63ff` dark) owns whole regions — the
masthead, team-sheet headers, primary buttons, headline blocks. Everything else is a two-value
ink-on-paper system. Pink (`#ff2d7a`) never decorates; it marks a live shuffle, an over-capacity
team, an unread notice, and nothing else.

- **paper / paper-2** — the photocopy ground and the "second sheet" used for clippings and
  panels. Always carries the toner-grain overlay (`/textures/grain-*.png`, authored raster).
- **ink / ink-soft** — toner black and faded toner. Secondary text is `ink-soft`, never a
  neutral gray; it is warm-tinted from the paper.
- **rule** — hairlines, dashed separators, ruled writing-paper lines.
- **riso / riso-ink** — the one committed colour and the text that sits on it.
- **alarm** — LIVE only.
- Dark mode ("night edition") swaps paper→pulp and ink→toner-white; riso brightens, pink holds,
  grain inverts to light flecks. Team identity is **never** carried by hue — teams are told
  apart by a hand-drawn number on an identical riso block.

## Typography

Two faces do all the work, plus one for annotations.

- **Display — Staatliches**, all-caps, condensed, wood-type character. Weight 400 only (the face
  ships no other weight; never request bold). Used at poster scale for page headlines
  (`clamp` up to ~4rem / `13vw`), and small-and-tracked for section labels and header tabs.
  `line-height: 0.92`, `letter-spacing: 0.005em` at display size, `0.14–0.2em` at label size.
- **Body — Courier Prime**, a real typewriter monospace. Every roster, list, table, form field,
  timestamp and paragraph. `tabular-nums` on by default. This is the "typed team sheet."
- **Annotation — Caveat**, a biro hand. Confined to: the dashboard greeting, "install it like
  an app" asides, the "held by X" name flag, hand-drawn team numerals. Never body copy.

Hierarchy is carried by **scale contrast alone** — poster headline against typewriter caption —
so modules never need boxes to organise themselves.

## Layout

- Content column `max-w-5xl` (app) / `max-w-4xl` (marketing), gutters `12–20px`.
- The app shell is a **masthead**: a riso wordmark block butted against a ruled "contents
  strip" of section links; a dashed sub-bar carries a rotated **stamped issue date**. On
  `<640px` the contents strip drops to a 4-cell bottom bar and a floating "Start a game" stamp
  sits in the thumb zone.
- Dashboard / event pages are a **tiled mosaic of ruled modules** (matchday-programme density),
  each with a stapled header tab; nothing floats in whitespace.
- The team board is a strict grid of **ruled "TEAM" sheets** — fixed columns, live time-ranked
  rows — that still reads as a semantic table with JS off.
- Spacing rhythm: tight within a slip, generous between modules, more space above a heading
  than below it.

## Elevation & Depth

Mostly flat — the world is paper. Depth is **physical, not ambient**:

- **Clipping shadow** (`--shadow-clip`): a hard 2–3px offset plus a soft 7–16px blur, warm-black
  light / true-black dark. Every `.clip` carries it; nothing else does.
- **Stamp shadow**: a 2px hard offset + a faint inner highlight, so primary buttons and stamps
  read as pressed ink.
- Staples, tape and the Polaroid avatar frame each cast their own small 1–3px shadow.
- No glows, no glass, no ghost-card 1px-border-under-soft-shadow.

## Shapes

- Radius is **3px or nothing**. The zine is scissored, not rounded; pills and large radii are
  absent by design.
- Borders are **2px solid ink** on anything structural (buttons, slips, sheets, tabs, dialogs),
  **1px `rule`** for hairlines, **1px dashed `rule`** for separators inside a module.
- Recurring forms: the **clipping** (`.clip` — paper-2, hairline, clip-shadow, optional 0.3–0.9°
  press-rotation via `--skew`), the **name-slip** (2px ink border, mono-bold name, avatar
  thumb), the **ruled sheet** (`repeating-linear-gradient` writing lines), the **stamp**
  (rotated riso or ink block, tracked caps), the **hazard strike** (`.struck` — 45° pink
  diagonal over anything cancelled/disabled).
- Icons: lucide, one stroke weight. Never a unicode glyph.

## Components

- **Button** — `primary` is the inked riso stamp (display caps, slight hover rotation);
  `secondary` a paper-2 block; `outline` a hairline-ink ghost; `danger` a pink-outline block;
  `link` riso underline. All 3px radius, `active:translate-y-px`.
- **Input / Textarea** — a fill-in-the-blank: no box, a 2px ink bottom-rule that turns riso on
  focus; textarea keeps a full 2px border over ruled paper.
- **Card** — the clipping. Optional `stapled` corner. Title in display caps, description in mono.
- **Badge** — a stamped tag: 2px border, display micro-caps. `riso` fills; `ink` inverts;
  `alarm` is the pink live/over-capacity mark; `outline` is a plain permission tag.
- **Tabs** — a contents strip: labels butted along a 2px ink frame, the active one filled ink.
- **Switch** — a ticked / empty ink checkbox (no sliding track).
- **Dialog** — a taped-down sheet (`.clip .taped`, faint rotation).
- **Avatar** — a Polaroid: thin paper frame, hairline, deterministic 0–2° tilt, photo
  desaturated; fallback is a muted monogram (initials carry identity, hue is a faint secondary
  aid only).
- **Team-sheet header** — every team is an identical riso block; the **hand-drawn number**
  (Caveat) is the only differentiator. The "not picked" pool uses a plain ink-ruled header.
- **Presence** — a viewer avatar stack; anyone shuffling gets a pink ring + pulsing pink dot.
  A **"held by X" flag** (Polaroid + Caveat name, pink edge) rides the slip they're dragging.

### Motion

One grammar: **things get lifted, slid, and stamped down.** `pin-in` for modules/menus
appearing; `peel` on a name-slip as it is grabbed; a 160ms cubic settle when it is dropped;
`flag-pop` + slow `flag-bob` for the held-by flag; a 1.1s `alarm-pulse` on the pink live dot.
All gated behind `prefers-reduced-motion`. No scattered hover transitions.

### Browser surfaces

Selection = riso block / riso-ink text. Caret = riso. Focus ring = 2px riso, 2px offset.
Scrollbar = thin `rule` thumb on a paper track. Native `<select>` = 2px ink border, paper
ground, a small ink caret drawn with two `linear-gradient`s. Tabular numerals on `body`.

## Do's and Don'ts

**Do**
- Let riso blue own whole regions; keep pink for LIVE only.
- Set every roster, list and field in Courier Prime; keep the reading field on clean paper.
- Differentiate teams by hand-drawn number, never by colour.
- Use the rubber stamp as the actual visibility control, not a decorative label.
- Keep grain and tape at the edges and on headers; never over body text.

**Don't**
- Don't request bold on Staatliches, or fall back to a system condensed face.
- Don't reach for a hue palette for teams, avatars, or status — the world is one blue + ink.
- Don't put a kicker/eyebrow phrase above a heading; a stapled index number on a module is
  the only label-above-title that is allowed, and only where a real contents sequence exists.
- Don't add rounded pills, glass, glows, or floating same-size card grids.
- Don't let pink decorate anything that isn't live.

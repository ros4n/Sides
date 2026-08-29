# DESIGN.md sidecar — Sides

Values that don't fit DESIGN.md's 8-prop component schema: the depth (shadow)
system, motion, and the print-artefact overlays. These are normative — treat
them as part of the design system, not drift.

## Shadow / depth ramp

The world is paper, so depth is physical (offset + blur), never an ambient glow.

| token | value | used by |
|---|---|---|
| `--shadow-clip` (light) | `2px 3px 0 rgba(28,24,19,.14), 4px 7px 14px rgba(28,24,19,.12)` | every `.clip` / `Card` |
| `--shadow-clip` (dark) | `2px 3px 0 rgba(0,0,0,.4), 4px 8px 16px rgba(0,0,0,.45)` | every `.clip` / `Card` |
| stamp press | `inset 0 0 0 2px rgba(255,255,255,.12), 2px 2px 0 rgba(28,24,19,.25)` | `.stamp`, primary `Button` |
| staple | `0 6px 0 -4px var(--ink-soft)` | `.stapled::before` |
| tape | `0 1px 3px rgba(0,0,0,.12)`; dashed edges `1px dashed rgba(0,0,0,.12)` | `.taped::after` |
| Polaroid frame | `1px 2px 0 rgba(28,24,19,.18)` | `Avatar` |
| peel (drag) | `3px 8px 14px rgba(0,0,0,.25)` | `@keyframes peel` on a grabbed name-slip |

`rgba(0,0,0,*)` / `rgba(255,255,255,*)` / `rgba(28,24,19,*)` appear **only** as
shadow and inset-highlight tints in the table above — never as fills, text, or
borders.

## Motion

One grammar — things get lifted, slid, and stamped down. All gated behind
`@media (prefers-reduced-motion: no-preference)`.

| name | spec | trigger |
|---|---|---|
| `pin-in` | 0.22s `cubic-bezier(.2,.9,.2,1)`, from `translateY(-6px) rotate(-1.5deg)` | modules, dropdown menus, dialog appearing |
| `peel` | 0.14s ease-out, to `rotate(-2.5deg) scale(1.03)` + peel shadow | name-slip grabbed on the board |
| drop settle | dnd-kit `dropAnimation` 160ms `cubic-bezier(.2,.9,.2,1)` | name-slip released |
| `flag-pop` | 0.16s ease-out, from `translateY(3px) scale(.85)` | "held by X" flag appears |
| `flag-bob` | 2.4s ease-in-out infinite, `translateY(0 → -2.5px) rotate(-2deg)` | "held by X" flag idle |
| `alarm-pulse` | 1.1s ease-in-out infinite, `opacity 1 ↔ .35` | the fluoro-pink LIVE dot only |

No hover-transition scatter; `transition-colors`/`transition-transform` on
buttons and links is the only incidental motion.

## Print-artefact overlays

| token | value | notes |
|---|---|---|
| toner grain | `url(/textures/grain-{light,dark}.png)` 320px tile, `opacity .62`, `mix-blend-mode: multiply` (light) / `screen` (dark), `position: fixed`, `z-index: 9999`, `pointer-events: none` | authored raster, never `feTurbulence` |
| `--tape` | `rgba(224,214,186,.66)` light / `rgba(50,45,34,.6)` dark | masking-tape fill |
| `.ruled` | `repeating-linear-gradient` writing lines, 1.5rem pitch, `var(--rule)` | team sheets, form textareas |
| `.halftone` | `radial-gradient(var(--ink) 1.1px, transparent 1.2px)` 7px grid | skeletons only — pure geometry |
| `.struck` | 45° `repeating-linear-gradient` in `color-mix(in srgb, var(--alarm) 55%, transparent)` | cancelled / disabled |

## Type ramp (small steps)

`--text-micro` 0.62rem · `--text-mini` 0.72rem · `--text-note` 0.82rem ·
`--text-body` 0.95rem, plus the standard Tailwind `text-xl…text-8xl` for
display headlines and `text-[13vw]`/`text-[15vw]` for the two poster covers
(dashboard "Next up", landing "Run your"). Everything below `text-xl` snaps to
the four small steps above.

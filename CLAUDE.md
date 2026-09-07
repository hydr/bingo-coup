# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Bingo Coup** — bingo where **every guest wins at the same moment**: the draw
order is predetermined, and every card is built to have bingo on one particular
draw, the same one for all of them.

Live at https://hydr.github.io/bingo-coup/, deployed by GitHub Pages from
`.github/workflows/ci.yml`. Plan: [docs/roadmap.md](docs/roadmap.md),
positioning: [docs/publication.md](docs/publication.md).

`Bingo.py` is the Python 2 prototype from 2011 and stays in the repository
untouched as a reference. **Do not touch it and do not port it** — the logic has
been rebuilt in `src/core/`.

## Commands

```bash
npm run dev                     # site at http://localhost:5173
npm test                        # Vitest: logic (92 tests)
npm run test:e2e                # Playwright: interface (21 tests)
npm run typecheck               # tsc + svelte-check
npx vitest run -t "camouflage"  # a single group
npm run demo 60 25              # a plan in the terminal
npm run range                   # which win times carry 80 guests?
npm run feasibility             # construction vs. selection (slow)
```

`npm run test:e2e` builds and starts `vite preview` on port 4173 itself, so what
gets tested is the production output rather than the dev server. Two traps to
know about:

- `vite preview` needs `--host`, otherwise it does not bind 127.0.0.1 and
  Playwright waits out its timeout.
- `reuseExistingServer` is deliberately `false`. With it on, a preview server
  left running from something else skips the build, and the whole suite passes
  green against a stale bundle. That happened twice. If port 4173 is occupied,
  Playwright now refuses to start rather than testing old code; free it with
  `Get-NetTCPConnection -LocalPort 4173 -State Listen` and `Stop-Process`.

## Architecture

A static site: Vite, Svelte 5, no backend. `src/core/` is plain TypeScript with
no dependencies and no DOM access, `src/ui/` the interface on top. That split
matters — the core must never know anything about the DOM, so the terminal
scripts in `scripts/` keep working.

- `types.ts` — data model and the rulesets `CLASSIC` / `OPEN_80` / `KIDS_3X3`
- `rules.ts` — lines, column ranges, free centre; `lines()` is cached
- `card.ts` — hit pattern and `winIndexOf()`: the draw a card wins on
- `generator.ts` — `buildCard()`, `generatePlan()`, `randomCard()`
- `rng.ts` — seeded; the same seed must return exactly the same plan

### Two things worth knowing

**A cell carries an `Item`, not a number.** The win logic works purely on
positions and draw indices and must never look at `label`. That keeps display
and logic apart and leaves the core open to other rulesets. Setting labels
freely is therefore technically possible (`generatePlan({ items })`) but is
**not a product goal** — the interface only ever offers numbers.

**`buildCard` works in three steps**: fill the winning line with items drawn
early, then decide "early or late" for every remaining square (the `Slot`
mask), then assign concrete items. The heart of it is `repairSlots`: every
foreign line needs at least one late square, otherwise there is a premature
bingo. `balanceAgainstSupply` then reconciles the mask with what is left per
column and has to trigger `repairSlots` again.

### Invariants

These promises must not break; all of them are tested:

1. Every card wins on exactly `winAt` — no line completes earlier.
2. No number twice on a card, each within its column range.
3. The same seed produces an identical plan.
4. The hit pattern matches that of honest winning cards (see below).

`buildCard` verifies every card independently with `winIndexOf` before returning
it and discards it on a mismatch. Do not remove that safety belt — it is why a
bug in the mask logic cannot end up on printed paper.

### Camouflage

The cards must not look prepared — guests glance at their neighbour's sheet. So
`naturalLook` scatters hits outside the winning line.

The yardstick is not any old card but an **honest card that happens to win on
`winAt`**; such a card has systematically more hits than average. The test
measures that reference at runtime via `randomCard` and rejection sampling
rather than estimating it. Anyone changing `naturalLook` checks against that
reference, not against a rule of thumb.

### Measured limits

With `generatePlan` reshuffling the draw order, every win time from 5 to 65
carries a room of 80 guests in under 30 ms. Feasibility is therefore **not** a
constraint — the sensible range follows from the drama, not the combinatorics.

A single draw order does not carry every win time, though: with early win times
a whole B-I-N-G-O column can go unseen in the first draws, leaving no winning
line to fill. `generatePlan` reshuffles in that case; `buildCard` on its own can
fail. The earliest possible win comes from `earliestWinNumber()` — 4 for
CLASSIC, because a line through the free centre needs only four real squares.

## Interface

- `src/ui/App.svelte` — landing page, generator and dry run in one
- `src/ui/lib/BingoCard.svelte` — one card; `brand={null}` is the default
- `src/ui/lib/HostSheet.svelte` — host sheet with the cue
- `src/ui/lib/DrawApp.svelte` — the projector draw app
- `src/ui/lib/planParams.ts` — the plan in the address bar, ruleset choice
- `src/ui/i18n/` — German and English messages

Svelte 5 with runes (`$state`, `$derived`, `$effect`). The screen view and the
print view **both** live in the DOM and carry the same `data-testid` — the print
view sits in `.print-only`, which only becomes visible under `@media print`. So
always scope tests with `getByRole('main')` or `.print-only`, otherwise
Playwright's strict mode complains.

Printing goes through print CSS rather than a PDF library: sharp vector type,
the same layout as the preview, no extra code. Four cards per A4 page, the host
sheet on a page of its own.

Two things that matter on paper and break easily:

1. **Printed cards are blank.** The print view renders with `drawn={0}`. The
   only marked square per card is the free centre — it counts as hit by
   definition (`positionOf(null)` returns `-1`).
2. **No imprint.** `brand` stays `null` by default. The product name on the
   table would give the surprise away.

### Language

Two locales, `src/ui/i18n/`. `en.ts` is the source of truth: `Messages` is
derived from it and `de.ts` has to `satisfies` that type, so a missing key is a
compile error. Interpolation uses plain functions rather than placeholder
strings, so the compiler checks every argument.

Note that `en.ts` deliberately has no `as const` — with it, every string would
become a literal type that no translation could satisfy.

Choice of language: `?lang=` in the address wins, then `localStorage`, then the
browser's setting, falling back to German. `persistLocale` writes the choice
into the address so a reload keeps it, and sets `<html lang>`.

**Every E2E test has to pin the language** (`/?lang=en`). Without that the tests
depend on the browser's locale and would disagree between machines.

### Errors from the core

`GenerationError` carries a `code` (`too-early`, `impossible`,
`pool-too-small`, `out-of-range`) alongside its message. The core's messages
stay technical and English — they talk about draw orders and attempt counts,
which is the wrong register for somebody planning a party. `describe()` in
`App.svelte` turns the code into a translated sentence. New error cases need a
code, or the interface cannot translate them.

### Careful with parameters from the address bar

`Number(null)` is `0`, not `NaN` — a missing parameter therefore slipped through
as zero instead of falling back, and the page without an address suffix started
with one guest and a win on draw 1, that is, in an error state. `clampInt` in
`planParams.ts` guards against it and `planParams.test.ts` pins it down.

### The draw app

Reachable at `#draw?g=…&w=…&s=…&r=…`. The plan sits entirely in those four
values because the seed determines everything, which is what lets the link be
sent to the machine at the projector and show exactly the draw that is on the
printout. That is what the most important E2E test checks ("the draw matches the
host sheet"); if it breaks, cards and draw order have drifted apart and the
whole evening would be lost.

Four things there are deliberate:

1. **The dark ground.** A deliberate exception to the paper palette: this is
   projected into a room that is often dimmed. Toggleable for bright rooms.
2. **The host cue is small and muted.** The host reads it at the machine; from
   ten metres on the projection it is illegible. It must not give the guests
   anything away — which is also why nothing else on that screen hints at the
   trick.
3. **A click during the drum roll shortens it** instead of being swallowed.
   The button used to be disabled, so clicking again lost the click.
4. **Changing the plan rebuilds the component** (`{#key drawHash(params)}` in
   `App.svelte`). Without it the draw keeps its counter, and anyone changing the
   seed would stand in the middle of a draw that no longer matches their freshly
   printed cards.

## Language of the source

Identifiers, comments and documentation are English. The interface is
translated; German lives in `src/ui/i18n/de.ts` and nowhere else.

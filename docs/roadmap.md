# Roadmap

The goal: turn the `Bingo.py` prototype into a finished product — a website a
host can use without any prior knowledge to prepare a game of bingo where
**every guest wins at the same moment**.

Positioning and marketing: see [publication.md](publication.md).

## Decisions taken

| Question | Decision |
|---|---|
| Technology | All TypeScript, running entirely in the browser. No backend. |
| Scope | The full package: landing page, generator, print output, projector draw app |
| Business model | Free, open source, public repository |
| Name | **Bingo Coup** (repository: `bingo-coup`) |
| Timeframe | No deadline — the priority is product quality |
| Variants | Numbers only. The data model stays generic, but word bingo is deliberately not a goal. |
| Rules | Classic 5×5, 1–75, B-I-N-G-O columns, free centre |
| Language | German and English, switchable in the interface |
| Design | Festive and warm: serifs, cream, a gold accent, plenty of air |

`Bingo.py` stays in the repository untouched, as a reference and as the origin
of the project.

## Where it started

`Bingo.py` is the Python 2 prototype from 2011 and had the right core idea. It
stays as a reference; the logic has been rebuilt in `src/core/`. Its known
weaknesses — duplicate numbers from two indexing bugs, one card instead of n,
discarding instead of retrying — are fixed there.

## Phase 0 — the core in TypeScript ✅ done

- TypeScript project, no runtime dependencies, no DOM access
- The classic rules including B-I-N-G-O columns and the free centre
- Tests on the core invariants
- Seed-based reproducibility: the same seed gives an identical plan

## Phase 1 — n cards to one draw ✅ done

`generatePlan()` takes a fixed draw order and a win time and produces n cards
that all win on that draw and none earlier. Variants through `winAtFor` (a wave
across tables, two groups, everybody-but-one).

### What the feasibility analysis showed

The worry that the classic rules might narrow the room too much **did not hold
up**. Measured with `scripts/range.ts`, 80 guests, five seeds each:

| Win time | Classic 1–75 | Open 1–80 |
|---|---|---|
| 5 to 65 | 5/5 succeeded | 5/5 succeeded |

Four to 26 ms for a whole room. Feasibility is therefore not a constraint — the
sensible range follows from the drama, not the combinatorics. The fallback to
`OPEN_80` is not needed but stays available as configuration.

What made that possible was a find during the measurement: a *single* draw order
does not carry every win time. With early win times a whole B-I-N-G-O column can
go unseen in the first draws, leaving no winning line to fill — draw 12
originally failed outright while 10 and 15 worked. Since we set the order
ourselves, `generatePlan` simply reshuffles. That closes the gap.

### Two planned features that turned out unnecessary

The shared final number and "everybody already has four marks" were planned as
separate stages. Both are **inevitable**: a card only wins on `winAt` if the
item of `winAt` sits on it and every other square of its winning line was drawn
before. The strongest version dramatically is the normal case, not an addition.

### The camouflage was the actual work

Not the combinatorics but the question of whether the cards *look genuine*.
Without a countermeasure a constructed card carries exactly the hits of its
winning line at the winning moment and nothing else — which any guest glancing
at their neighbour's sheet would notice.

The right yardstick is not an average card but an honest one that happens to win
on `winAt`; that card has systematically more hits, because it got lucky.
Measured at draw 25 of 75:

| | Mean hits |
|---|---|
| An honest card that happens to win on 25 | 11.33 |
| Our constructed card | 11.48 |
| Without `naturalLook` (counter-check) | 6 |

A by-product: an honest card wins on exactly draw 25 in 1.25 % of cases. The
cards could therefore be obtained by selection rather than construction —
perfectly camouflaged, because they would be genuine. `scripts/feasibility.ts`
compares both routes. Construction wins because it is reliable across the whole
range and about a thousand times faster; `randomCard()` stays as the reference
for the tests and for an "ordinary bingo" mode.

## Phase 2 — output for printing ✅ done

- Cards, four per A4 page, **numbered** — so the host knows which card goes
  where. That is exactly where it goes wrong in practice.
- **The host sheet**: not just the list of numbers but the cue — "after 47
  everybody has bingo, hand out the prize now". Without that document the trick
  does not work.
- Done with print CSS rather than a PDF library: sharp vector type, the same
  layout as the preview, no extra code. The user prints to PDF from the browser.

## Phase 3 — the website ✅ done

Three parts, all static:

1. ✅ **A landing page** that makes the effect clear in five seconds
2. ✅ **An interactive generator**: guests, win time, seed, ruleset → live
   preview → print. Plus the **dry run**: a slider across the whole draw that
   counts live how many cards have bingo. Zero up to the second-to-last number,
   then all of them — more convincing than any explanation, and at the same time
   the best check before printing.
3. ✅ **The projector draw app**: a big number on a dark ground, a drum roll, a
   board of every number drawn, fullscreen, keyboard control. The plan travels
   in the link, so the machine at the projector is guaranteed to show the same
   order as the printout. The host cue is small and muted — readable at the
   machine, not on the projection.

Design: festive and warm, serif type, cream with a gold accent, generous
spacing. The same for the site and the printed cards.

## Phase 4 — two languages ✅ done

German and English, switchable in the header. `src/ui/i18n/en.ts` is the source
of truth; `de.ts` has to satisfy the type derived from it, so a missing
translation is a compile error. The choice can be forced with `?lang=`, is
remembered in `localStorage` and otherwise follows the browser.

Errors from the core carry a code so the interface can phrase them in the chosen
language, in words a host can act on.

## Published

Live at **https://hydr.github.io/bingo-coup/**, via GitHub Pages out of
`.github/workflows/ci.yml`. It deploys on every push to `master`, but only once
the type check, the unit tests and the Playwright tests are green.

Should a domain of its own follow later, it goes into the repository settings as
a custom domain; nothing about the setup changes.

## Phase 5 — marketing

See [publication.md](publication.md).

## Still open

- White-labelling is done: the imprint on the cards is off by default, and the
  draw app shows the product name nowhere.
- Secure the domain: `bingocoup.de` and `coupbingo.com` looked free in a DNS
  check. **The trade mark registers have not been checked** — see
  publication.md.
- A 3×3 grid for children exists as the `KIDS_3X3` ruleset and can be chosen in
  the interface; a design of its own for it is still missing.
- Who makes the first video? That needs a real occasion.

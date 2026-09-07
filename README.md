# Bingo Coup

**[hydr.github.io/bingo-coup](https://hydr.github.io/bingo-coup/)**

Bingo where **every guest wins at the same moment**.

To everyone in the room it looks like an ordinary game: real cards, a host
reading out numbers. Only the draw order is fixed in advance, and every card is
built so that it has bingo on one particular draw — the same one for all of
them. Over the last few rounds one guest after another notices they are a single
number short. Then it falls, and the whole room rises at once.

Made for family occasions: a golden wedding, a wedding, a children's birthday, a
company party. Nobody is favoured and there is no loser — the "prize" is
something that was there for everyone anyway.

**Not** made for raffles played for money.

## Status

Fully usable: generator, print output and the projector draw app. Available in
German and English. What is still open is in [docs/roadmap.md](docs/roadmap.md).

## Try it

The [site](https://hydr.github.io/bingo-coup/) runs entirely in the browser —
no sign-up, no server. Locally:

```bash
npm install
npm run dev        # site at http://localhost:5173
```

In the dry run you drag a slider through the draw and watch how nobody has bingo
up to the second-to-last number — and then everybody does.

For the evening itself, "Run the draw on a projector" opens a fullscreen view:
one big number, a drum roll, a board of everything drawn so far. The link to it
carries the whole plan, so you can send it to the machine at the projector and
are guaranteed the same order that is on your printout.

Controls: space or a click draws, left arrow takes one back, `F` toggles
fullscreen, `Esc` returns to the generator.

```bash
npm test           # 92 unit tests
npm run test:e2e   # 21 Playwright tests of the interface
npm run demo 60 25 # a plan in the terminal, no browser needed
npm run range      # which win times can furnish 80 guests?
```

## How it works

```ts
import { generatePlan } from './src/core/index.js'

const plan = generatePlan({
  cardCount: 60,   // guests
  winAt: 25,       // bingo on the 26th draw (zero-based)
  seed: 20260906,  // the same seed returns exactly the same cards
})

plan.drawOrder    // read out in exactly this order
plan.winningItem  // the number that sets off the whole room
plan.cards        // one card per guest
```

The default is the classic ruleset: 5×5, numbers 1–75, B-I-N-G-O columns, free
centre. Alongside it there is an open ruleset (1–80, no column ranges) and a 3×3
grid for children.

## Origin

`Bingo.py` is the original prototype from 2011, written for a golden wedding. It
is still in the repository, untouched.

## Licence

MIT

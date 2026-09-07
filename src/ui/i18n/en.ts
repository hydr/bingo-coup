/**
 * English messages — and the source of truth for the shape of a translation.
 *
 * Interpolation is done with plain functions rather than placeholder strings:
 * that way the compiler checks every argument, and a translator cannot silently
 * drop a value or misspell a placeholder name.
 */
export const en = {
  brand: 'Bingo Coup',
  /** The browser tab. Set at runtime, because the language can change. */
  documentTitle: 'Bingo Coup — bingo where everybody wins at once',

  hero: {
    title: ['Bingo where', 'everybody wins at once.'],
    lead:
      'To everyone in the room it looks like an ordinary game: real cards, a host ' +
      'reading out numbers. Only the order is fixed in advance — and every card ' +
      'built so that the same number is the one it still needs. When it falls, the ' +
      'whole room rises at the same moment.',
  },

  generator: {
    heading: 'Create a plan',
    guests: 'Guests',
    winNumber: 'Bingo on draw',
    seed: 'Seed',
    rules: 'Rules',
    reroll: 'Different cards',
    print: 'Print cards and host sheet',
    startDraw: 'Run the draw on a projector',
    brandToggle: (brand: string) => `Print “${brand}” on the cards`,
    seedHint:
      'The seed makes a plan reproducible: if the printout gets lost, the same seed ' +
      'returns exactly the same cards. The imprint stays off by default — on the ' +
      'table it would give the surprise away.',
    linkHint:
      'The draw runs in the browser and takes over the reading out. Its link carries ' +
      'the whole plan, so you can send it to the machine hooked up to the projector ' +
      'and get exactly the order that is on your printout.',
  },

  rulesets: {
    classic: 'Classic — 5×5, 1–75, free centre',
    open80: 'Open — 5×5, 1–80, every square',
    kids: 'Kids — 3×3, 1–30',
  },

  errors: {
    // The core throws technical messages; these are what a host should read.
    tooEarly: (min: number) =>
      `Nobody can win that early. A winning line needs at least ${min} numbers.`,
    impossible:
      'No plan could be built for these settings. Try a later draw for the bingo, ' +
      'or fewer guests.',
    poolTooSmall: 'These rules do not offer enough numbers for a card.',
    unknown: 'That plan could not be built.',
    technical: 'Technical detail',
  },

  sim: {
    heading: 'Dry run',
    lead: (winNumber: number) =>
      `Drag the slider through the draw. Up to number ${winNumber} nobody has bingo — ` +
      'then everybody at once.',
    sliderLabel: 'Numbers drawn',
    drawn: 'Drawn',
    last: 'Last',
    bingo: 'Bingo',
    ofTotal: (total: number) => `of ${total}`,
    ofCards: (cards: number) => `of ${cards} cards`,
    waiting: (guests: number, item: string) =>
      `All ${guests} cards are now waiting for the ${item}.`,
    triumph: (guests: number, item: string) =>
      `All ${guests} cards have bingo — set off by the ${item}.`,
    previewHeading: 'Preview',
    previewHint:
      'The rings show the state at the slider position. The gold row is the winning ' +
      'line — only you see that, never a guest.',
    showAll: (count: number) => `Show all ${count} cards`,
  },

  card: {
    label: (id: number) => `Card ${id}`,
    aria: (id: number) => `Bingo card ${id}`,
    free: 'FREE',
  },

  host: {
    heading: 'Host sheet',
    meta: (guests: number, winNumber: number, seed: number) =>
      `${guests} cards · bingo on draw ${winNumber} · seed ${seed}`,
    cueLabel: 'Cue:',
    cue: (guests: number, winNumber: number) =>
      ` — that is draw ${winNumber} — all ${guests} guests have bingo at the same ` +
      'moment. Hand out the prize, or let them unwrap.',
    cueBefore: 'After the number',
    drawHeading: 'Draw order',
    drawHint:
      'Read the numbers in exactly this order. Skip or swap one and nobody wins ' +
      'together.',
  },

  draw: {
    startPrompt: 'Tap to start',
    allDrawn: 'Every number drawn',
    nextLabel: 'Draw the next number',
    progress: (drawn: number, total: number) => `Draw ${drawn} of ${total}`,
    cueNext: 'next number sets off everybody',
    cueNow: 'now: everybody has bingo',
    back: 'back',
    reset: 'restart',
    board: 'board',
    light: 'light',
    fullscreen: 'fullscreen',
    exit: 'back to the generator',
  },

  footer:
    'Made for family occasions — a golden wedding, a wedding, a children’s ' +
    'birthday, a company party. Nobody is favoured and there is no loser. Not made ' +
    'for raffles played for money.',

  language: {
    label: 'Language',
    de: 'Deutsch',
    en: 'English',
  },
}

/** The shape every translation has to satisfy. */
export type Messages = typeof en

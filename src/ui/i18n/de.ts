import type { Messages } from './en.js'

/** German messages. `satisfies` keeps this in step with `en.ts`. */
export const de = {
  brand: 'Bingo Coup',
  documentTitle: 'Bingo Coup — Bingo, bei dem alle gleichzeitig gewinnen',

  hero: {
    title: ['Bingo, bei dem', 'alle gleichzeitig gewinnen.'],
    lead:
      'Das Spiel läuft für alle sichtbar normal ab: echte Karten, ein Moderator, der ' +
      'Zahlen vorliest. Nur ist die Reihenfolge vorher festgelegt — und jede Karte so ' +
      'gebaut, dass ihr am Ende dieselbe Zahl fehlt. Dann fällt sie, und der ganze ' +
      'Saal springt im selben Augenblick auf.',
  },

  generator: {
    heading: 'Spielplan erzeugen',
    guests: 'Gäste',
    winNumber: 'Bingo bei Ziehung',
    seed: 'Seed',
    rules: 'Regeln',
    reroll: 'Andere Karten',
    print: 'Karten und Moderatorenblatt drucken',
    startDraw: 'Ziehung am Beamer starten',
    brandToggle: (brand: string) => `Aufdruck „${brand}“ auf den Karten`,
    seedHint:
      'Der Seed macht den Plan reproduzierbar: Geht der Ausdruck verloren, liefert ' +
      'derselbe Seed exakt dieselben Karten. Der Aufdruck bleibt standardmäßig weg — ' +
      'auf dem Tisch würde er die Überraschung verraten.',
    linkHint:
      'Die Ziehung läuft im Browser und übernimmt das Vorlesen. Der Link dorthin ' +
      'enthält den Plan — du kannst ihn auf das Gerät schicken, das am Beamer hängt, ' +
      'und bekommst dort garantiert dieselbe Reihenfolge wie auf dem Ausdruck.',
  },

  rulesets: {
    classic: 'Klassisch — 5×5, 1–75, freies Mittelfeld',
    open80: 'Offen — 5×5, 1–80, alle Felder',
    kids: 'Kinder — 3×3, 1–30',
  },

  errors: {
    tooEarly: (min: number) =>
      `So früh kann niemand gewinnen. Eine Gewinnlinie braucht mindestens ${min} Zahlen.`,
    impossible:
      'Für diese Einstellungen ließ sich kein Plan bauen. Versuche einen späteren ' +
      'Zeitpunkt für das Bingo oder weniger Gäste.',
    poolTooSmall: 'Diese Regeln geben nicht genug Zahlen für eine Karte her.',
    unknown: 'Dieser Plan ließ sich nicht bauen.',
    technical: 'Technische Meldung',
  },

  sim: {
    heading: 'Probelauf',
    lead: (winNumber: number) =>
      `Zieh den Regler durch die Ziehung. Bis zur ${winNumber}. Zahl hat niemand ` +
      'Bingo — dann alle auf einmal.',
    sliderLabel: 'Anzahl gezogener Zahlen',
    drawn: 'Gezogen',
    last: 'Zuletzt',
    bingo: 'Bingo',
    ofTotal: (total: number) => `von ${total}`,
    ofCards: (cards: number) => `von ${cards} Karten`,
    waiting: (guests: number, item: string) =>
      `Alle ${guests} Karten warten jetzt auf die ${item}.`,
    triumph: (guests: number, item: string) =>
      `Alle ${guests} Karten haben Bingo — ausgelöst von der ${item}.`,
    previewHeading: 'Vorschau',
    previewHint:
      'Die Ringe zeigen den Stand beim Reglerwert. Die goldene Fläche ist die ' +
      'Gewinnlinie — die sieht nur du, nicht der Gast.',
    showAll: (count: number) => `Alle ${count} Karten zeigen`,
  },

  card: {
    label: (id: number) => `Karte ${id}`,
    aria: (id: number) => `Bingokarte ${id}`,
    free: 'FREI',
  },

  host: {
    heading: 'Moderatorenblatt',
    meta: (guests: number, winNumber: number, seed: number) =>
      `${guests} Karten · Bingo bei der ${winNumber}. Ziehung · Seed ${seed}`,
    cueLabel: 'Regie:',
    cue: (guests: number, winNumber: number) =>
      ` — das ist die ${winNumber}. Ziehung — haben alle ${guests} Gäste ` +
      'gleichzeitig Bingo. Ab hier den Preis verteilen bzw. auspacken lassen.',
    cueBefore: 'Nach der Zahl',
    drawHeading: 'Ziehungsreihenfolge',
    drawHint:
      'Genau in dieser Reihenfolge vorlesen. Wird eine Zahl übersprungen oder ' +
      'vertauscht, gewinnt niemand gleichzeitig.',
  },

  draw: {
    startPrompt: 'Zum Starten tippen',
    allDrawn: 'Alle Zahlen gezogen',
    nextLabel: 'Nächste Zahl ziehen',
    progress: (drawn: number, total: number) => `Ziehung ${drawn} von ${total}`,
    cueNext: 'nächste Zahl löst alle aus',
    cueNow: 'jetzt: alle haben Bingo',
    back: 'zurück',
    reset: 'neu',
    board: 'tafel',
    light: 'licht',
    fullscreen: 'vollbild',
    exit: 'zurück zum Generator',
  },

  footer:
    'Gedacht für Familienfeiern — Goldene Hochzeit, Hochzeit, Kindergeburtstag, ' +
    'Firmenfeier. Niemand wird bevorzugt, es gibt keinen Verlierer. Nicht gedacht ' +
    'für Verlosungen mit Geldeinsatz.',

  language: {
    label: 'Sprache',
    de: 'Deutsch',
    en: 'English',
  },
} satisfies Messages

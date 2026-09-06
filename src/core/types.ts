/**
 * Datenmodell.
 *
 * Zentrale Entscheidung: Eine Zelle traegt kein `number`, sondern ein `Item`
 * mit Beschriftung. Dadurch teilen Zahlen-Bingo ("47") und Begriffe-Bingo
 * ("Jemand weint") dieselbe Gewinnlogik — die arbeitet ausschliesslich auf
 * Positionen und Ziehungsindizes, nie auf dem Inhalt.
 */

/** Ein ziehbares Element. `id` ist die Identitaet, `label` nur Darstellung. */
export interface Item {
  readonly id: number
  readonly label: string
}

/** Zellinhalt. `null` ist das freie Mittelfeld und gilt immer als getroffen. */
export type Cell = Item | null

/** Spielregeln. Alles daran ist Konfiguration, damit wir bei zu engem
 *  Spielraum abschalten koennen statt umzubauen. */
export interface Ruleset {
  readonly rows: number
  readonly cols: number
  /** Anzahl ziehbarer Elemente insgesamt. */
  readonly poolSize: number
  /** B-I-N-G-O: jede Spalte hat ihren eigenen Zahlenbereich. */
  readonly columnRanges: boolean
  /** Freies Mittelfeld (nur bei ungerader Kantenlaenge sinnvoll). */
  readonly freeCenter: boolean
  /** Spaltenueberschriften, z.B. B I N G O. */
  readonly columnLabels: readonly string[] | null
}

export interface Card {
  readonly id: number
  /** Zeilenweise, Laenge rows * cols. */
  readonly cells: readonly Cell[]
  /** Welche Linie (Index in `lines(ruleset)`) zum Gewinn fuehrt. */
  readonly winningLine: number
}

/** Ein vollstaendiger Spielplan — alles, was fuer einen Abend gebraucht wird. */
export interface Plan {
  readonly ruleset: Ruleset
  readonly seed: number
  /** Feste, vorbestimmte Ziehungsreihenfolge. Ohne sie kein Gleichzeitigkeit. */
  readonly drawOrder: readonly Item[]
  readonly cards: readonly Card[]
  /** Index in `drawOrder`, bei dem alle Karten gewinnen (0-basiert). */
  readonly winAt: number
  /** Das Element, das den Saal ausloest. Ergibt sich aus `winAt`. */
  readonly winningItem: Item
}

/** Klassisches Bingo: 5x5, 1-75, B-I-N-G-O-Spalten, freies Mittelfeld. */
export const CLASSIC: Ruleset = {
  rows: 5,
  cols: 5,
  poolSize: 75,
  columnRanges: true,
  freeCenter: true,
  columnLabels: ['B', 'I', 'N', 'G', 'O'],
}

/** Wie der urspruengliche Prototyp: 5x5, 1-80, keine Spaltenbindung,
 *  kein freies Feld. Fallback, falls CLASSIC zu wenig Spielraum laesst. */
export const OPEN_80: Ruleset = {
  rows: 5,
  cols: 5,
  poolSize: 80,
  columnRanges: false,
  freeCenter: false,
  columnLabels: null,
}

/** Kleines Feld fuer Kinder. */
export const KIDS_3X3: Ruleset = {
  rows: 3,
  cols: 3,
  poolSize: 30,
  columnRanges: false,
  freeCenter: true,
  columnLabels: null,
}

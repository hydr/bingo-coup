import { assertCardValid, drawPositions, signatureOf, winIndexOf } from './card.js'
import {
  cellCount,
  columnOf,
  fitsColumn,
  freeIndex,
  lines,
  numberItems,
  validateRuleset,
} from './rules.js'
import { createRng, randomSeed, type Rng } from './rng.js'
import type { Card, Item, Plan, Ruleset } from './types.js'
import { CLASSIC } from './types.js'

/** Wie ein Feld belegt werden soll. */
type Slot =
  | 'free' // das freie Mittelfeld
  | 'line' // Teil der Gewinnlinie
  | 'early' // Element, das vor dem Gewinnzeitpunkt gezogen wird (Ablenkung)
  | 'late' // Element, das erst danach gezogen wird (blockiert fremde Linien)

export interface CardOptions {
  /**
   * Streut Treffer ausserhalb der Gewinnlinie ein, damit die Karte im
   * Trefferbild von einer echten nicht zu unterscheiden ist.
   *
   * Ohne das haette jede Karte zum Gewinnzeitpunkt exakt die Treffer ihrer
   * Gewinnlinie und sonst nichts — was jedem Gast auffaellt, der auf den
   * Zettel seines Nachbarn schaut.
   */
  readonly naturalLook?: boolean
  /** Abbruch nach so vielen Fehlversuchen fuer eine einzelne Karte. */
  readonly maxAttempts?: number
}

const DEFAULTS = { naturalLook: true, maxAttempts: 200 } as const

export class GenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GenerationError'
  }
}

/**
 * Erzeugt eine Karte, die bei Ziehung `winAt` gewinnt — und keine Ziehung
 * frueher.
 *
 * Aufbau in drei Schritten:
 *   1. Eine Gewinnlinie waehlen und mit frueh gezogenen Elementen fuellen; das
 *      Element von `winAt` schliesst sie ab.
 *   2. Fuer alle uebrigen Felder entscheiden, ob dort ein frueh oder spaet
 *      gezogenes Element steht. Jede fremde Linie braucht mindestens ein
 *      spaetes Feld, sonst gibt es ein verfruehtes Bingo.
 *   3. Konkrete Elemente zuweisen, spaltengerecht und ohne Wiederholung.
 *
 * Am Ende wird das Ergebnis unabhaengig nachgerechnet. Eine Karte, die den
 * Gewinnzeitpunkt verfehlt, verlaesst diese Funktion nicht.
 */
export function buildCard(
  ruleset: Ruleset,
  drawOrder: readonly Item[],
  winAt: number,
  rng: Rng,
  cardId: number,
  options: CardOptions = {},
): Card {
  const { naturalLook, maxAttempts } = { ...DEFAULTS, ...options }

  if (winAt < 0 || winAt >= drawOrder.length) {
    throw new GenerationError(
      `Gewinnzeitpunkt ${winAt} liegt ausserhalb der Ziehung (0..${drawOrder.length - 1}).`,
    )
  }

  const positions = drawPositions(drawOrder)
  const winningItem = drawOrder[winAt]!
  const early = drawOrder.slice(0, winAt)
  const late = drawOrder.slice(winAt + 1)
  const allLines = lines(ruleset)
  const free = freeIndex(ruleset)
  const total = cellCount(ruleset)

  // Nur Linien, die das ausloesende Element ueberhaupt aufnehmen koennen.
  // Bei B-I-N-G-O-Spalten scheidet damit ein Grossteil der senkrechten Linien
  // aus: Sie liegen im falschen Zahlenbereich.
  const candidates: number[] = []
  for (let i = 0; i < allLines.length; i++) {
    const usable = allLines[i]!.some(
      (idx) => idx !== free && fitsColumn(ruleset, winningItem, columnOf(ruleset, idx)),
    )
    if (usable) candidates.push(i)
  }
  if (candidates.length === 0) {
    throw new GenerationError(
      `Kein Feld kann ${winningItem.label} aufnehmen — Regelsatz und Ziehung passen nicht zusammen.`,
    )
  }

  let lastReason = 'unbekannt'

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = tryBuild()
    if (typeof result === 'string') {
      lastReason = result
      continue
    }
    return result
  }

  throw new GenerationError(
    `Karte ${cardId} liess sich nach ${maxAttempts} Versuchen nicht bauen (${lastReason}). ` +
      `Gewinnzeitpunkt ${winAt} ist fuer diesen Regelsatz vermutlich zu frueh oder zu spaet.`,
  )

  function tryBuild(): Card | string {
    const lineIdx = rng.pick(candidates)
    const line = allLines[lineIdx]!
    const inLine = new Set(line)

    // --- Schritt 1: Gewinnlinie -------------------------------------------
    const cells: (Item | null)[] = new Array<Item | null>(total).fill(null)
    const used = new Set<number>()

    const slotsForWinner = line.filter(
      (idx) => idx !== free && fitsColumn(ruleset, winningItem, columnOf(ruleset, idx)),
    )
    const winCell = rng.pick(slotsForWinner)
    cells[winCell] = winningItem
    used.add(winningItem.id)

    for (const idx of line) {
      if (idx === free || idx === winCell) continue
      const col = columnOf(ruleset, idx)
      const pool = early.filter((it) => !used.has(it.id) && fitsColumn(ruleset, it, col))
      if (pool.length === 0) return 'zu wenige frueh gezogene Elemente fuer die Gewinnlinie'
      const chosen = rng.pick(pool)
      cells[idx] = chosen
      used.add(chosen.id)
    }

    // --- Schritt 2: frueh/spaet fuer alle uebrigen Felder ------------------
    const slots: Slot[] = new Array<Slot>(total)
    for (let i = 0; i < total; i++) {
      if (i === free) slots[i] = 'free'
      else if (inLine.has(i)) slots[i] = 'line'
      else slots[i] = 'late'
    }

    if (naturalLook) {
      // Trefferdichte einer echten Karte: jedes Feld ist mit p bereits getroffen.
      const p = winAt / drawOrder.length
      for (let i = 0; i < total; i++) {
        if (slots[i] === 'late' && rng.next() < p) slots[i] = 'early'
      }
    }

    const repaired = repairSlots(slots, winCell)
    if (repaired !== null) return repaired

    const balanced = balanceAgainstSupply(slots, used, winCell)
    if (balanced !== null) return balanced

    // --- Schritt 3: Elemente zuweisen -------------------------------------
    for (let col = 0; col < ruleset.cols; col++) {
      const earlyPool = rng.shuffled(
        early.filter((it) => !used.has(it.id) && fitsColumn(ruleset, it, col)),
      )
      const latePool = rng.shuffled(
        late.filter((it) => !used.has(it.id) && fitsColumn(ruleset, it, col)),
      )

      for (let row = 0; row < ruleset.rows; row++) {
        const idx = row * ruleset.cols + col
        const slot = slots[idx]!
        if (slot === 'free' || slot === 'line') continue

        const chosen = slot === 'early' ? earlyPool.pop() : latePool.pop()
        if (chosen === undefined) {
          return slot === 'early'
            ? 'zu wenige frueh gezogene Elemente fuer die Fuellfelder'
            : 'zu wenige spaet gezogene Elemente fuer die Fuellfelder'
        }
        cells[idx] = chosen
        used.add(chosen.id)
      }
    }

    // --- Sicherheitsgurt: unabhaengig nachrechnen -------------------------
    const card: Card = { id: cardId, cells, winningLine: lineIdx }
    try {
      assertCardValid(card, ruleset)
    } catch (error) {
      return `ungueltige Karte (${(error as Error).message})`
    }
    const actual = winIndexOf(card, ruleset, positions)
    if (actual !== winAt) return `Gewinn bei Ziehung ${actual} statt ${winAt}`

    return card
  }

  /**
   * Sorgt dafuer, dass jede fremde Linie mindestens ein spaet gezogenes Feld
   * enthaelt. Linien, die das ausloesende Element tragen, sind unkritisch: Sie
   * werden fruehestens zum Gewinnzeitpunkt vollstaendig, nicht davor. Das gilt
   * auch fuer die Gewinnlinie selbst.
   *
   * Gibt `null` bei Erfolg zurueck, sonst den Grund des Scheiterns.
   */
  function repairSlots(slots: Slot[], winCell: number): string | null {
    for (let pass = 0; pass < total * 2; pass++) {
      let dangerous = -1

      for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i]!
        if (line.includes(winCell)) continue
        if (line.some((idx) => slots[idx] === 'late')) continue
        dangerous = i
        break
      }
      if (dangerous === -1) return null

      const fixable = allLines[dangerous]!.filter((idx) => slots[idx] === 'early')
      if (fixable.length === 0) return 'fremde Linie laesst sich nicht entschaerfen'
      slots[rng.pick(fixable)] = 'late'
    }
    return 'Entschaerfung der Linien konvergiert nicht'
  }

  /**
   * Gleicht die Maske an den tatsaechlichen Vorrat je Spalte ab. Sind zu wenige
   * spaete Elemente vorhanden, muessen Felder auf "frueh" wechseln — und danach
   * ist die Linienpruefung erneut faellig.
   */
  function balanceAgainstSupply(
    slots: Slot[],
    used: ReadonlySet<number>,
    winCell: number,
  ): string | null {
    for (let round = 0; round < 8; round++) {
      let changed = false

      for (let col = 0; col < ruleset.cols; col++) {
        const earlySupply = early.filter(
          (it) => !used.has(it.id) && fitsColumn(ruleset, it, col),
        ).length
        const lateSupply = late.filter(
          (it) => !used.has(it.id) && fitsColumn(ruleset, it, col),
        ).length

        const earlyCells: number[] = []
        const lateCells: number[] = []
        for (let row = 0; row < ruleset.rows; row++) {
          const idx = row * ruleset.cols + col
          if (slots[idx] === 'early') earlyCells.push(idx)
          else if (slots[idx] === 'late') lateCells.push(idx)
        }

        if (earlyCells.length + lateCells.length > earlySupply + lateSupply) {
          return `Spalte ${col} hat zu wenige Elemente uebrig`
        }

        // Zu viele "frueh" geplant: unkritisch, spaet ist immer sicher.
        for (let i = earlySupply; i < earlyCells.length; i++) {
          slots[earlyCells[i]!] = 'late'
          changed = true
        }
        // Zu viele "spaet" geplant: umwidmen und danach erneut pruefen.
        for (let i = lateSupply; i < lateCells.length; i++) {
          slots[lateCells[i]!] = 'early'
          changed = true
        }
      }

      if (!changed) return null

      const repaired = repairSlots(slots, winCell)
      if (repaired !== null) return repaired
    }
    return 'Abgleich mit dem Elementvorrat konvergiert nicht'
  }
}

export interface PlanOptions extends CardOptions {
  readonly ruleset?: Ruleset
  /** Anzahl Karten — also Gaeste. */
  readonly cardCount: number
  /** Ziehungsindex, bei dem gewonnen wird (0-basiert). */
  readonly winAt: number
  readonly seed?: number
  /** Eigene Elemente, z.B. Begriffe. Standard sind die Zahlen 1..poolSize. */
  readonly items?: readonly Item[]
  /**
   * Abweichender Gewinnzeitpunkt je Karte — fuer die Welle (tischweise) oder
   * zwei Gruppen. Ohne Angabe gewinnen alle gemeinsam.
   */
  readonly winAtFor?: (cardIndex: number) => number
}

/**
 * Erzeugt einen vollstaendigen Spielplan: feste Ziehungsreihenfolge plus
 * Karten, die alle bei derselben Ziehung gewinnen.
 *
 * Nebenbefund aus der Konstruktion, urspruenglich als eigene Ausbaustufe
 * geplant: Eine Karte gewinnt nur dann bei `winAt`, wenn das Element von
 * `winAt` auf ihr steht. Alle Karten teilen sich also zwangslaeufig dieselbe
 * ausloesende Zahl und haben davor bereits alle uebrigen Felder ihrer
 * Gewinnlinie getroffen. Die dramaturgisch staerkste Variante ist damit der
 * Normalfall und kein Zusatz.
 */
export function generatePlan(options: PlanOptions): Plan {
  const ruleset = options.ruleset ?? CLASSIC
  validateRuleset(ruleset)

  const seed = options.seed ?? randomSeed()
  const rng = createRng(seed)

  const items = options.items ?? numberItems(ruleset)
  if (items.length < ruleset.poolSize) {
    throw new GenerationError(
      `Zu wenige Elemente: ${items.length} fuer einen Pool von ${ruleset.poolSize}.`,
    )
  }

  const winAtFor = options.winAtFor ?? (() => options.winAt)

  // Nicht jede Ziehungsreihenfolge traegt jeden Gewinnzeitpunkt. Bei fruehen
  // Zeitpunkten kann eine ganze B-I-N-G-O-Spalte in den ersten Ziehungen leer
  // ausgehen — dann laesst sich keine Gewinnlinie mehr fuellen. Da wir die
  // Reihenfolge selbst festlegen, ist das kein Grund aufzugeben: wir mischen
  // neu. Der Seed bleibt dabei massgeblich, das Ergebnis reproduzierbar.
  const maxShuffles = 25
  let lastError: GenerationError | null = null

  for (let shuffle = 0; shuffle < maxShuffles; shuffle++) {
    const drawOrder = rng.shuffled(items)

    try {
      const cards: Card[] = []
      const seen = new Set<string>()

      for (let i = 0; i < options.cardCount; i++) {
        let card: Card | null = null

        // Doppelte Karten waeren kein Fehler, wirken am Tisch aber sofort falsch.
        for (let dedupe = 0; dedupe < 50; dedupe++) {
          const candidate = buildCard(ruleset, drawOrder, winAtFor(i), rng, i + 1, options)
          if (!seen.has(signatureOf(candidate))) {
            card = candidate
            break
          }
        }
        if (card === null) {
          throw new GenerationError(
            `Ab Karte ${i + 1} entstehen nur noch Wiederholungen — der Regelsatz ` +
              `laesst nicht genug verschiedene Karten zu.`,
          )
        }

        seen.add(signatureOf(card))
        cards.push(card)
      }

      return {
        ruleset,
        seed,
        drawOrder,
        cards,
        winAt: options.winAt,
        winningItem: drawOrder[options.winAt]!,
      }
    } catch (error) {
      if (!(error instanceof GenerationError)) throw error
      lastError = error
    }
  }

  throw new GenerationError(
    `Auch nach ${maxShuffles} Ziehungsreihenfolgen liess sich kein Plan bauen. ` +
      `Zuletzt: ${lastError?.message ?? 'unbekannt'}`,
  )
}

/**
 * Eine ehrliche Zufallskarte — ohne jede Vorgabe zum Gewinnzeitpunkt.
 *
 * Wird an zwei Stellen gebraucht: fuer den Modus "normales Bingo" und als
 * Vergleichsmassstab in den Tests. Nur gegen echte Karten laesst sich
 * beurteilen, ob eine praeparierte Karte unauffaellig aussieht.
 */
export function randomCard(
  ruleset: Ruleset,
  items: readonly Item[],
  rng: Rng,
  cardId = 1,
): Card {
  const free = freeIndex(ruleset)
  const total = cellCount(ruleset)
  const cells: (Item | null)[] = new Array<Item | null>(total).fill(null)
  const used = new Set<number>()

  for (let col = 0; col < ruleset.cols; col++) {
    const pool = rng.shuffled(
      items.filter((it) => !used.has(it.id) && fitsColumn(ruleset, it, col)),
    )
    for (let row = 0; row < ruleset.rows; row++) {
      const idx = row * ruleset.cols + col
      if (idx === free) continue
      const chosen = pool.pop()
      if (chosen === undefined) {
        throw new GenerationError(`Spalte ${col} hat zu wenige Elemente.`)
      }
      cells[idx] = chosen
      used.add(chosen.id)
    }
  }

  return { id: cardId, cells, winningLine: -1 }
}

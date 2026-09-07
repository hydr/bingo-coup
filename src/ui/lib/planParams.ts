import { CLASSIC, KIDS_3X3, OPEN_80, type Ruleset } from '../../core/types.js'

/**
 * Ein Spielplan steckt vollständig in vier Werten — der Seed bestimmt Karten
 * und Ziehungsreihenfolge eindeutig. Deshalb passt er in die Adresszeile.
 *
 * Das ist mehr als eine Abkürzung: Der Gastgeber kann den Link auf das Gerät
 * schicken, das am Beamer hängt, und bekommt dort garantiert dieselbe Ziehung
 * wie auf seinem Ausdruck. Ohne Server, ohne Konto, ohne Datei.
 */
export interface PlanParams {
  guests: number
  /** 1-basiert, wie in der Oberfläche. */
  winNumber: number
  seed: number
  rulesetKey: string
}

export const RULESETS: Record<string, { label: string; ruleset: Ruleset }> = {
  classic: { label: 'Klassisch — 5×5, 1–75, freies Mittelfeld', ruleset: CLASSIC },
  open80: { label: 'Offen — 5×5, 1–80, alle Felder', ruleset: OPEN_80 },
  kids: { label: 'Kinder — 3×3, 1–30', ruleset: KIDS_3X3 },
}

export function rulesetOf(key: string): Ruleset {
  return (RULESETS[key] ?? RULESETS.classic!).ruleset
}

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  // Achtung: `Number(null)` ist 0 und `Number('')` auch. Ohne diese Abfrage
  // wuerde ein fehlender Parameter als 0 durchgehen statt den Standard zu
  // nehmen — und die Seite ohne Hash mit einem Gast und Gewinn bei Ziehung 1
  // starten, also im Fehlerzustand.
  if (value === null || value === undefined || value === '') return fallback
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Liest die Parameter aus dem Hash. Fehlt etwas, greifen sichere Standards. */
export function readParams(hash: string): { view: 'generator' | 'draw'; params: PlanParams } {
  const [route, query] = hash.replace(/^#\/?/, '').split('?')
  const search = new URLSearchParams(query ?? '')

  const rulesetKey = search.get('r') ?? 'classic'
  const known = rulesetKey in RULESETS ? rulesetKey : 'classic'
  const poolSize = rulesetOf(known).poolSize

  return {
    view: route === 'draw' ? 'draw' : 'generator',
    params: {
      guests: clampInt(search.get('g'), 1, 500, 60),
      winNumber: clampInt(search.get('w'), 1, poolSize, 26),
      seed: clampInt(search.get('s'), 0, 0xffffffff, 20260907),
      rulesetKey: known,
    },
  }
}

export function drawHash(params: PlanParams): string {
  const search = new URLSearchParams({
    g: String(params.guests),
    w: String(params.winNumber),
    s: String(params.seed),
    r: params.rulesetKey,
  })
  return `#draw?${search.toString()}`
}

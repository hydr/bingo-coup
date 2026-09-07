import { CLASSIC, KIDS_3X3, OPEN_80, type Ruleset } from '../../core/types.js'

/**
 * A plan is fully described by four values — the seed determines the cards and
 * the draw order. So it fits in the address bar.
 *
 * That is more than a shortcut: the host can send the link to the machine
 * hooked up to the projector and is guaranteed the same draw order that is on
 * their printout. No server, no account, no file to copy.
 */
export interface PlanParams {
  guests: number
  /** One-based, as in the interface. */
  winNumber: number
  seed: number
  rulesetKey: RulesetKey
}

/** The rulesets on offer. Their labels live in the translations. */
export const RULESETS = {
  classic: CLASSIC,
  open80: OPEN_80,
  kids: KIDS_3X3,
} as const

export type RulesetKey = keyof typeof RULESETS
export const RULESET_KEYS = Object.keys(RULESETS) as readonly RulesetKey[]

function isRulesetKey(value: string | null): value is RulesetKey {
  return value !== null && value in RULESETS
}

export function rulesetOf(key: string): Ruleset {
  return isRulesetKey(key) ? RULESETS[key] : CLASSIC
}

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  // Careful: `Number(null)` is 0 and so is `Number('')`. Without this check a
  // missing parameter would pass through as zero instead of falling back — and
  // the page without a hash would start with one guest and a win on draw 1,
  // that is, in an error state.
  if (value === null || value === undefined || value === '') return fallback
  const n = Math.trunc(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Reads the parameters out of the hash. Anything missing falls back safely. */
export function readParams(hash: string): { view: 'generator' | 'draw'; params: PlanParams } {
  const [route, query] = hash.replace(/^#\/?/, '').split('?')
  const search = new URLSearchParams(query ?? '')

  const rawKey = search.get('r')
  const rulesetKey: RulesetKey = isRulesetKey(rawKey) ? rawKey : 'classic'
  const poolSize = RULESETS[rulesetKey].poolSize

  return {
    view: route === 'draw' ? 'draw' : 'generator',
    params: {
      guests: clampInt(search.get('g'), 1, 500, 60),
      winNumber: clampInt(search.get('w'), 1, poolSize, 26),
      seed: clampInt(search.get('s'), 0, 0xffffffff, 20260907),
      rulesetKey,
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

import { de } from './de.js'
import { en, type Messages } from './en.js'

export type { Messages }

export const LOCALES = { de, en } as const
export type Locale = keyof typeof LOCALES

export const LOCALE_ORDER: readonly Locale[] = ['de', 'en']

function isLocale(value: string | null): value is Locale {
  return value === 'de' || value === 'en'
}

const STORAGE_KEY = 'bingo-coup:locale'
const QUERY_KEY = 'lang'

/**
 * Picks the language, in this order: an explicit `?lang=` in the address (so a
 * link can carry it), then a previous choice, then what the browser asks for.
 *
 * German comes first as the fallback because the German-speaking market is the
 * one this is aimed at; see docs/publication.md.
 */
export function detectLocale(): Locale {
  const fromQuery = new URLSearchParams(location.search).get(QUERY_KEY)
  if (isLocale(fromQuery)) return fromQuery

  const stored = readStored()
  if (stored) return stored

  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split('-')[0]
    if (base === 'de') return 'de'
    if (base === 'en') return 'en'
  }
  return 'de'
}

function readStored(): Locale | null {
  // Private windows and blocked site data make this throw, so never assume it
  // works — the language just falls back to the browser's setting.
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLocale(value) ? value : null
  } catch {
    return null
  }
}

/** Remembers the choice and puts it in the address, so a reload keeps it. */
export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Not being able to remember it is not worth bothering anyone about.
  }

  const url = new URL(location.href)
  url.searchParams.set(QUERY_KEY, locale)
  history.replaceState(null, '', url)

  document.documentElement.lang = locale
}

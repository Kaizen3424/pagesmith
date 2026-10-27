/**
 * Shared collator — the ONE ordering used by library sort and relation pickers.
 * Matches `String.prototype.localeCompare(_, "nl-NL")` (repository tests pin it).
 */

export const DEFAULT_LOCALE = "nl-NL"

export type SortDirection = "asc" | "desc"

export function createTextCollator(locale: string = DEFAULT_LOCALE): Intl.Collator {
  return new Intl.Collator(locale)
}

const defaultCollator = createTextCollator()

export function compareText(a: string, b: string, locale: string = DEFAULT_LOCALE): number {
  if (locale === DEFAULT_LOCALE) return defaultCollator.compare(a, b)
  return createTextCollator(locale).compare(a, b)
}

export function compareNumbers(a: number, b: number): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/**
 * Compares display values: strings collate, numbers order numerically,
 * empty values sort last regardless of direction (founder-friendly libraries).
 */
export function compareValues(a: unknown, b: unknown, direction: SortDirection = "asc"): number {
  const aEmpty = a === null || a === undefined || a === ""
  const bEmpty = b === null || b === undefined || b === ""
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1

  let result: number
  if (typeof a === "number" && typeof b === "number") result = compareNumbers(a, b)
  else result = compareText(String(a), String(b))
  return direction === "desc" ? -result : result
}

export function sortBy<T>(
  items: readonly T[],
  getValue: (item: T) => unknown,
  direction: SortDirection = "asc",
): T[] {
  return [...items].sort((a, b) => compareValues(getValue(a), getValue(b), direction))
}

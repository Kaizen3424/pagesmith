/**
 * Money display for the yve corpus: integer euro prices (`1475` → `€ 1.475`).
 * One formatter, same locale as the collator. Non-finite input renders empty.
 */

export interface MoneyFormatOptions {
  readonly locale?: string
  readonly currency?: string
  readonly maximumFractionDigits?: number
  readonly minimumFractionDigits?: number
}

export function formatMoney(amount: number, options: MoneyFormatOptions = {}): string {
  if (!Number.isFinite(amount)) return ""
  return new Intl.NumberFormat(options.locale ?? "nl-NL", {
    style: "currency",
    currency: options.currency ?? "EUR",
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
  }).format(amount)
}

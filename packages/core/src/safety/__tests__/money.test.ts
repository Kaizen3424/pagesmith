import { describe, expect, it } from "vitest"
import { formatMoney } from "../money"

describe("money formatting", () => {
  it("renders nl-NL euro integers with a non-breaking space", () => {
    expect(formatMoney(1475)).toBe("€\u00a01.475")
    expect(formatMoney(0)).toBe("€\u00a00")
    expect(formatMoney(129000)).toBe("€\u00a0129.000")
  })

  it("returns empty for non-finite input", () => {
    expect(formatMoney(Number.NaN)).toBe("")
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe("")
  })

  it("honours locale/currency overrides", () => {
    expect(formatMoney(1475, { locale: "en-US", currency: "USD" })).toBe("$1,475")
  })
})

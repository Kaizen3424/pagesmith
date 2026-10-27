import { describe, expect, it } from "vitest"
import { compareText, compareValues, sortBy } from "../collator"

describe("shared collator", () => {
  it("matches localeCompare for nl-NL", () => {
    const pairs: readonly (readonly [string, string])[] = [
      ["10", "9"],
      ["2", "10"],
      ["appel", "Appel"],
      ["éclair", "eclair"],
      ["ijsvrij", "ijs"],
      ["z", "a"],
    ]
    for (const [a, b] of pairs) {
      const expected = Math.sign(a.localeCompare(b, "nl-NL"))
      expect(Math.sign(compareText(a, b)), `${a} vs ${b}`).toBe(expected)
    }
  })

  it("orders numbers numerically and empties last", () => {
    expect(
      sortBy([{ v: 10 }, { v: 9 }, { v: 2 }, { v: null }], (item) => item.v).map((i) => i.v),
    ).toEqual([2, 9, 10, null])
  })

  it("supports descending order with empties still last", () => {
    expect(
      sortBy([{ v: 10 }, { v: 9 }, { v: undefined }], (item) => item.v, "desc").map((i) => i.v),
    ).toEqual([10, 9, undefined])
  })

  it("compares mixed scalar values", () => {
    expect(compareValues("a", "b")).toBeLessThan(0)
    expect(compareValues(1, 2)).toBeLessThan(0)
    expect(compareValues("", "a")).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from "vitest"
import { parseUntrustedJson } from "../untrusted-json"

describe("INV-S06 parse caps", () => {
  it("enforces custom caps", () => {
    const result = parseUntrustedJson("[1,2,3]", { maxListItems: 2 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues[0]?.code).toBe("TOO_MANY_ITEMS")
  })

  it("rejects non-finite numbers that JSON allows as literals", () => {
    const result = parseUntrustedJson("1e999")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues[0]?.code).toBe("INVALID_JSON")
  })

  it("renders recursion guard: deep tree fails without throwing", () => {
    const deep = `${"[".repeat(200)}1${"]".repeat(200)}`
    expect(() => parseUntrustedJson(deep)).not.toThrow()
    expect(parseUntrustedJson(deep).ok).toBe(false)
  })
})

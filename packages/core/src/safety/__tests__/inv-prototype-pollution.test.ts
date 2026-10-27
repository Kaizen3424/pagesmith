import { describe, expect, it } from "vitest"
import { parseUntrustedJson, utf8ByteLength } from "../untrusted-json"

describe("INV-S05 prototype pollution", () => {
  it("strips __proto__ at the root and nested levels", () => {
    const raw =
      '{"__proto__":{"polluted":"yes"},"nested":{"__proto__":{"polluted":"nested"},"safe":1}}'

    const result = parseUntrustedJson(raw)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(result.strippedKeys).toEqual(["$.__proto__", "$.nested.__proto__"])
    expect(result.value).toEqual({ nested: { safe: 1 } })
    expect(Object.getPrototypeOf(result.value)).toBe(Object.prototype)
  })

  it("strips constructor.prototype chains", () => {
    const raw = JSON.stringify({
      constructor: { prototype: { polluted: "yes" } },
      prototype: { polluted: "also" },
      keep: true,
    })

    const result = parseUntrustedJson(raw)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(result.strippedKeys).toEqual(["$.constructor", "$.prototype"])
    expect(result.value).toEqual({ keep: true })
  })

  it("strips dangerous keys inside arrays too", () => {
    const raw = '[{"__proto__":{"polluted":1},"a":1}]'
    const result = parseUntrustedJson(raw)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.strippedKeys).toEqual(["$[0].__proto__"])
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it("preserves key insertion order", () => {
    const raw = '{"z":1,"a":2,"m":3}'
    const result = parseUntrustedJson(raw)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(Object.keys(result.value as Record<string, unknown>)).toEqual(["z", "a", "m"])
  })
})

describe("INV-S06 size/depth caps", () => {
  it("rejects input over the byte cap before parsing", () => {
    const raw = JSON.stringify({ text: "a".repeat(2 * 1024 * 1024) })
    const result = parseUntrustedJson(raw)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues[0]?.code).toBe("TOO_LARGE")
  })

  it("counts UTF-8 bytes, not UTF-16 code units", () => {
    expect(utf8ByteLength("abc")).toBe(3)
    expect(utf8ByteLength("€")).toBe(3)
    expect(utf8ByteLength("😀")).toBe(4)
  })

  it("allows depth 64 and rejects depth 65", () => {
    const nested = (depth: number): string => `${"[".repeat(depth)}0${"]".repeat(depth)}`

    expect(parseUntrustedJson(nested(64)).ok).toBe(true)
    const tooDeep = parseUntrustedJson(nested(65))
    expect(tooDeep.ok).toBe(false)
    if (tooDeep.ok) return
    expect(tooDeep.issues[0]?.code).toBe("TOO_DEEP")
  })

  it("allows 5000 list items and rejects 5001", () => {
    expect(parseUntrustedJson(JSON.stringify(Array.from({ length: 5000 }, () => 1))).ok).toBe(true)

    const tooMany = parseUntrustedJson(JSON.stringify(Array.from({ length: 5001 }, () => 1)))
    expect(tooMany.ok).toBe(false)
    if (tooMany.ok) return
    expect(tooMany.issues[0]?.code).toBe("TOO_MANY_ITEMS")
  })

  it("returns a Result for malformed JSON", () => {
    const result = parseUntrustedJson("{not json")
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues[0]?.code).toBe("INVALID_JSON")
  })
})

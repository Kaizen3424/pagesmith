import { describe, expect, it } from "vitest"
import { parseEntry } from "../parse"
import { mergeUntouched, validateEntryForSave } from "../validate"
import { cleanRaw, driftRaw, media, productFields } from "./fixtures"

const filePath = "src/content/products/iris-no-7.json"

describe("INV-S03 lenient read / strict save", () => {
  it("parses all six drift cases with banners instead of throwing", () => {
    const parsed = parseEntry({ fields: productFields, raw: driftRaw(), filePath, media })
    const codes = parsed.issues.map((issue) => issue.code)
    expect(codes).toContain("INVALID_OPTION")
    expect(codes).toContain("TYPE_MISMATCH")
    expect(codes).toContain("LIST_TOO_SHORT")
    expect(codes).toContain("PATTERN_MISMATCH")
    expect(parsed.issues.some((issue) => issue.severity === "error")).toBe(true)
    expect(parsed.issues.some((issue) => issue.code === "UNMODELED_KEY")).toBe(true)
    expect(parsed.value.title).toBe("Iris No. 7")
  })

  it("accepts the clean fixture with zero issues and derives the slug", () => {
    const parsed = parseEntry({ fields: productFields, raw: cleanRaw(), filePath, media })
    expect(parsed.issues).toEqual([])
    expect(parsed.value.slug).toBe("iris-no-7")
    expect(parsed.untouched).toEqual({})
  })

  it("refuses to save an unclean entry", async () => {
    const result = await validateEntryForSave({
      fields: productFields,
      raw: driftRaw(),
      filePath,
      media,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it("flags relations against missing entries via services", async () => {
    const result = await validateEntryForSave({
      fields: productFields,
      raw: cleanRaw(),
      filePath,
      media,
      services: {
        hasEntry: (_collection, value) => value !== "missing-product",
      },
    })
    expect(result.ok).toBe(true)

    const missing = await validateEntryForSave({
      fields: productFields,
      raw: { ...cleanRaw(), featured: "missing-product" },
      filePath,
      media,
      services: {
        hasEntry: (_collection, value) => value !== "missing-product",
      },
    })
    expect(missing.ok).toBe(false)
    if (missing.ok) return
    expect(missing.issues.some((issue) => issue.code === "RELATION_UNKNOWN")).toBe(true)
  })

  it("preserves unmodeled keys verbatim through the untouched patch", async () => {
    const parsed = parseEntry({ fields: productFields, raw: driftRaw(), filePath, media })
    expect(parsed.untouched["/extraDeveloperKey"]).toEqual({ kept: true })
    expect(parsed.untouched["/images/0/devCaption"]).toBe("keep me")

    const merged = mergeUntouched(parsed.value, parsed.untouched)
    expect(merged.extraDeveloperKey).toEqual({ kept: true })
    const images = merged.images as readonly Record<string, unknown>[]
    expect(images[0]?.devCaption).toBe("keep me")
    expect(images[0]?.alt).toBe("Iris No. 7 sculptural lamp")

    const clean = await validateEntryForSave({
      fields: productFields,
      raw: {
        ...cleanRaw(),
        extraDeveloperKey: { kept: true },
      },
      filePath,
      media,
    })
    expect(clean.ok).toBe(true)
    if (!clean.ok) return
    expect(clean.untouched["/extraDeveloperKey"]).toEqual({ kept: true })
  })

  it("does not crash on hostile raw values", () => {
    const parsed = parseEntry({ fields: productFields, raw: [1, 2], filePath, media })
    expect(parsed.value).toEqual({})
    expect(parsed.issues[0]?.code).toBe("TYPE_MISMATCH")
  })
})

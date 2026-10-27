import { describe, expect, it } from "vitest"
import { parseEntry } from "../parse"
import { cleanRaw, media, productFields } from "./fixtures"

describe("INV-S04 parse is default-immune", () => {
  it("never injects hidden or optional defaults on open", () => {
    const raw = cleanRaw()
    delete raw.materialFilter
    delete raw.featured
    const parsed = parseEntry({
      fields: productFields,
      raw,
      filePath: "src/content/products/iris-no-7.json",
      media,
    })

    expect(parsed.issues).toEqual([])
    expect(Object.hasOwn(parsed.value, "materialFilter")).toBe(false)
    expect(Object.hasOwn(parsed.value, "featured")).toBe(false)
    expect(parsed.value.materialFilter).toBeUndefined()
  })

  it("never injects nested defaults inside list items", () => {
    const raw = cleanRaw()
    const images = raw.images as Record<string, unknown>[]
    const first = images[0]
    if (first === undefined) throw new Error("fixture missing image")
    delete first.objectPosition

    const parsed = parseEntry({
      fields: productFields,
      raw,
      filePath: "src/content/products/iris-no-7.json",
      media,
    })
    expect(parsed.issues).toEqual([])
    const parsedImages = parsed.value.images as Record<string, unknown>[]
    expect(Object.hasOwn(parsedImages[0] ?? {}, "objectPosition")).toBe(false)
  })

  it("does not materialize defaults when required values are missing", () => {
    const parsed = parseEntry({
      fields: productFields,
      raw: {},
      filePath: "src/content/products/new.json",
      media,
    })
    expect(parsed.issues.some((issue) => issue.code === "MISSING_REQUIRED")).toBe(true)
    expect(Object.hasOwn(parsed.value, "materialFilter")).toBe(false)
    expect(Object.hasOwn(parsed.value, "featured")).toBe(false)
  })
})

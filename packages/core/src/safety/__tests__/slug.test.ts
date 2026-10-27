import { describe, expect, it } from "vitest"
import { deriveSlug } from "../slug"

describe("virtual slug", () => {
  it("derives the slug from the filename only", () => {
    expect(deriveSlug("src/content/products/iris-no-7.json")).toBe("iris-no-7")
    expect(deriveSlug("src/content/products/iris-no-7.JSON")).toBe("iris-no-7")
    expect(deriveSlug("iris-no-7.json")).toBe("iris-no-7")
  })

  it("refuses non-json and empty names", () => {
    expect(deriveSlug("src/content/products/iris-no-7.md")).toBeNull()
    expect(deriveSlug("src/content/products/.json")).toBeNull()
    expect(deriveSlug("src/content/products/")).toBeNull()
  })
})

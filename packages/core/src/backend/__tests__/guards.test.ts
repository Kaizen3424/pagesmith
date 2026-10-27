import { describe, expect, it } from "vitest"
import { assertNotTruncated } from "../guards"

describe("assertNotTruncated (INV-N02 setup)", () => {
  it("passes a clean recursive read through untouched", () => {
    const read = { sha: "aaa", truncated: false }
    const result = assertNotTruncated(read)
    expect(result.ok).toBe(true)
    expect(result.ok && result.value).toBe(read)
  })

  it("fails loudly when the read is truncated (TR5: never decide on a truncated tree)", () => {
    const result = assertNotTruncated({ sha: "bbb", truncated: true })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("TREE_TRUNCATED")
      expect(result.error.sha).toBe("bbb")
      expect(result.error.detail).toContain("truncated")
    }
  })

  it("accepts reads without a sha (first hop, sha unknown yet)", () => {
    const result = assertNotTruncated({ truncated: true })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.sha).toBeUndefined()
  })
})

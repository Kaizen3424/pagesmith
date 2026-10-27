import { describe, expect, it } from "vitest"
import { safePath } from "../safe-path"

describe("INV-T02 safePath", () => {
  it("accepts repo-relative and public media paths", () => {
    expect(safePath("src/content/products/iris-no-7.json", { prefix: "src/content" }).ok).toBe(true)
    expect(
      safePath("/images/products/iris-no-7.jpg", { absolute: true, prefix: "/images" }).ok,
    ).toBe(true)
  })

  it("rejects traversal, backslashes, encoded separators and encoded dots", () => {
    for (const path of [
      "src/content/../secrets.json",
      "src/content/a/..%2f..%2fsecrets.json",
      "src/content\\products\\iris.json",
      "src/content/%2e%2e/secrets.json",
      "src/content/%2E%2E/secrets.json",
      "src/content//iris.json",
    ]) {
      expect(safePath(path).ok, path).toBe(false)
    }
  })

  it("rejects prefix escapes at segment boundaries", () => {
    expect(safePath("/images-other/x.jpg", { absolute: true, prefix: "/images" }).ok).toBe(false)
    expect(safePath("/images/../secret", { absolute: true, prefix: "/images" }).ok).toBe(false)
    expect(safePath("src/content-other/x.json", { prefix: "src/content" }).ok).toBe(false)
  })

  it("rejects schemes, drives, protocol-relative and control chars", () => {
    for (const path of [
      "http://evil.example/x",
      "C:/Windows/x",
      "//evil.example/x",
      "src/content/\u0000x",
      "src/content/\nx",
      " src/content/x",
    ]) {
      expect(safePath(path).ok, JSON.stringify(path)).toBe(false)
    }
  })

  it("requires public paths to be absolute and repo paths relative", () => {
    expect(safePath("/images/a.jpg", { absolute: true }).ok).toBe(true)
    expect(safePath("images/a.jpg", { absolute: true }).ok).toBe(false)
    expect(safePath("/src/content/a.json").ok).toBe(false)
  })
})

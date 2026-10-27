import { describe, expect, it } from "vitest"
import { safeUrl } from "../safe-url"

describe("INV-T03 safeUrl", () => {
  it("allows http(s) and same-origin relative paths", () => {
    expect(safeUrl("https://example.com/iris").ok).toBe(true)
    expect(safeUrl("http://localhost:4173/preview").ok).toBe(true)
    expect(safeUrl("/iris-no-7").ok).toBe(true)
  })

  it("rejects javascript:, data:, file:, vbscript: and mixed case", () => {
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "file:///C:/Windows",
      "vbscript:msgbox(1)",
      "ftp://example.com/x",
    ]) {
      expect(safeUrl(url).ok, url).toBe(false)
    }
  })

  it("rejects protocol-relative, credentials and malformed hosts", () => {
    expect(safeUrl("//evil.example/x").ok).toBe(false)
    expect(safeUrl("https://user:pass@example.com/x").ok).toBe(false)
    expect(safeUrl("https://").ok).toBe(false)
    expect(safeUrl("https:///path").ok).toBe(false)
  })

  it("rejects control-char and encoded-newline bypasses", () => {
    for (const url of [
      "\njavascript:alert(1)",
      "java\nscript:alert(1)",
      "https://example.com/%0aX",
      "https://example.com/%0dX",
      "https://example.com\\@evil.example",
    ]) {
      expect(safeUrl(url).ok, JSON.stringify(url)).toBe(false)
    }
  })
})

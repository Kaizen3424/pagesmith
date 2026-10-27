import { describe, expect, it } from "vitest"
import { decodeBase64, decodeUtf8, encodeUtf8 } from "../encoding"

describe("runtime-agnostic codecs (no TextEncoder/atob/Buffer in core)", () => {
  it("round-trips ASCII, accents, CJK, and emoji", () => {
    for (const text of ["", "hello", "Iris No. 7 — Yve", "灯 · ランプ", "🕯️✨", "a\u0000b"]) {
      expect(decodeUtf8(encodeUtf8(text))).toBe(text)
    }
  })

  it("matches known UTF-8 byte sequences", () => {
    expect([...encodeUtf8("A")]).toEqual([0x41])
    expect([...encodeUtf8("é")]).toEqual([0xc3, 0xa9])
    expect([...encodeUtf8("€")]).toEqual([0xe2, 0x82, 0xac])
    expect([...encodeUtf8("🕯")]).toEqual([0xf0, 0x9f, 0x95, 0xaf])
  })

  it("replaces malformed UTF-8 instead of throwing (untrusted bytes render)", () => {
    expect(decodeUtf8(Uint8Array.from([0xff]))).toBe("\uFFFD")
    expect(decodeUtf8(Uint8Array.from([0xe2, 0x82]))).toBe("\uFFFD\uFFFD")
    expect(decodeUtf8(Uint8Array.from([0xc3, 0x28]))).toBe("\uFFFD(")
    expect(decodeUtf8(Uint8Array.from([0xed, 0xa0, 0x80]))).toContain("\uFFFD")
    expect(decodeUtf8(Uint8Array.from([0xe0, 0x80, 0x80]))).toContain("\uFFFD")
    expect(decodeUtf8(Uint8Array.from([0xf4, 0x90, 0x80, 0x80]))).toContain("\uFFFD")
  })

  it("decodes GitHub base64 including newlines and padding", () => {
    expect(decodeUtf8(decodeBase64("aGVsbG8="))).toBe("hello")
    expect(decodeUtf8(decodeBase64("aGVs\nbG8=\n"))).toBe("hello")
    expect(decodeUtf8(decodeBase64("8J+Vr/CfjJ8="))).toBe("🕯🌟")
    expect(decodeBase64("")).toHaveLength(0)
    expect(decodeBase64("YQ==")).toEqual(Uint8Array.from([0x61]))
    expect(decodeBase64("YWI=")).toEqual(Uint8Array.from([0x61, 0x62]))
  })

  it("rejects invalid base64 rather than guessing", () => {
    expect(() => decodeBase64("abc")).toThrow(/length/)
    expect(() => decodeBase64("a!==")).toThrow(/character/)
    expect(() => decodeBase64("====")).toThrow(/padding/)
  })
})

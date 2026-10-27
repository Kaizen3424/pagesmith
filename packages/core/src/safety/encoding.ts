/**
 * Runtime-agnostic UTF-8/base64 codecs. Core avoids TextEncoder/atob/Buffer so
 * the same code runs in Node tests and browser bundles (no DOM lib dependency).
 */

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

const BASE64_LOOKUP: Record<string, number> = {}
for (let index = 0; index < BASE64_ALPHABET.length; index += 1) {
  BASE64_LOOKUP[BASE64_ALPHABET[index] as string] = index
}

export function encodeUtf8(text: string): Uint8Array {
  const bytes: number[] = []
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0x7f) {
      bytes.push(code)
    } else if (code <= 0x7ff) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code <= 0xffff) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
    }
  }
  return Uint8Array.from(bytes)
}

export function decodeUtf8(bytes: Uint8Array): string {
  let out = ""
  let index = 0
  while (index < bytes.length) {
    const first = bytes[index] as number
    if (first <= 0x7f) {
      out += String.fromCharCode(first)
      index += 1
      continue
    }
    if (first >= 0xc2 && first <= 0xdf) {
      const second = bytes[index + 1]
      if (second === undefined || (second & 0xc0) !== 0x80) {
        out += "\uFFFD"
        index += 1
        continue
      }
      out += String.fromCharCode(((first & 0x1f) << 6) | (second & 0x3f))
      index += 2
      continue
    }
    if (first >= 0xe0 && first <= 0xef) {
      const second = bytes[index + 1]
      const third = bytes[index + 2]
      if (
        second === undefined ||
        third === undefined ||
        (second & 0xc0) !== 0x80 ||
        (third & 0xc0) !== 0x80
      ) {
        out += "\uFFFD"
        index += 1
        continue
      }
      const code = ((first & 0x0f) << 12) | ((second & 0x3f) << 6) | (third & 0x3f)
      if (code < 0x800 || (code >= 0xd800 && code <= 0xdfff)) {
        out += "\uFFFD"
        index += 1
        continue
      }
      out += String.fromCharCode(code)
      index += 3
      continue
    }
    if (first >= 0xf0 && first <= 0xf4) {
      const second = bytes[index + 1]
      const third = bytes[index + 2]
      const fourth = bytes[index + 3]
      if (
        second === undefined ||
        third === undefined ||
        fourth === undefined ||
        (second & 0xc0) !== 0x80 ||
        (third & 0xc0) !== 0x80 ||
        (fourth & 0xc0) !== 0x80
      ) {
        out += "\uFFFD"
        index += 1
        continue
      }
      const code =
        ((first & 0x07) << 18) | ((second & 0x3f) << 12) | ((third & 0x3f) << 6) | (fourth & 0x3f)
      if (code < 0x10000 || code > 0x10ffff) {
        out += "\uFFFD"
        index += 1
        continue
      }
      out += String.fromCodePoint(code)
      index += 4
      continue
    }
    out += "\uFFFD"
    index += 1
  }
  return out
}

export function decodeBase64(text: string): Uint8Array {
  const clean = text.replace(/\s+/g, "")
  if (clean.length % 4 !== 0) throw new Error("invalid base64 length")
  const bytes: number[] = []
  for (let index = 0; index < clean.length; index += 4) {
    const chunk = clean.slice(index, index + 4)
    const values = [0, 0, 0, 0]
    let padding = 0
    for (let offset = 0; offset < 4; offset += 1) {
      const char = chunk[offset]
      if (char === undefined) throw new Error("invalid base64 chunk")
      if (char === "=") {
        padding += 1
        continue
      }
      const value = BASE64_LOOKUP[char]
      if (value === undefined) throw new Error("invalid base64 character")
      values[offset] = value
    }
    if (padding > 2) throw new Error("invalid base64 padding")
    const [first = 0, second = 0, third = 0, fourth = 0] = values
    bytes.push((first << 2) | (second >> 4))
    if (padding < 2) bytes.push(((second & 0x0f) << 4) | (third >> 2))
    if (padding < 1) bytes.push(((third & 0x03) << 6) | fourth)
  }
  return Uint8Array.from(bytes)
}

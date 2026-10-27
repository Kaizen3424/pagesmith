/// <reference types="node" />
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { FixtureBackend } from "../../backends/reference-fixture-backend"
import {
  documentsCanonicallyEqual,
  parseJsonDocument,
  serializeDocument,
} from "../../serialization"

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_ROOT = resolve(HERE, "../../../../..", "playground", "fixtures", "repo")

const manifest = JSON.parse(readFileSync(join(FIXTURE_ROOT, "manifest.json"), "utf8")) as {
  files: readonly { path: string }[]
}
const jsonPaths = manifest.files
  .map((entry) => entry.path)
  .filter((path) => path.startsWith("src/content/") && path.endsWith(".json"))

describe("INV-S02 P1 scope: serializer identity + CRLF + empty tree diff", () => {
  it("round-trips every mirrored JSON document byte-for-byte", () => {
    expect(jsonPaths.length).toBe(20) // 14 yve content docs + 6 drift fixtures
    for (const path of jsonPaths) {
      const raw = readFileSync(join(FIXTURE_ROOT, path), "utf8")
      const parsed = parseJsonDocument(raw)
      expect(parsed.ok).toBe(true)
      if (!parsed.ok) continue
      expect(serializeDocument(parsed.document, parsed.document.value)).toBe(raw)
    }
  })

  it("treats CRLF and LF variants as canonically equal without reflowing", () => {
    const raw = readFileSync(join(FIXTURE_ROOT, jsonPaths[0] as string), "utf8")
    const crlf = raw.replace(/\n/g, "\r\n")
    expect(documentsCanonicallyEqual(raw, crlf)).toBe(true)
    const parsed = parseJsonDocument(crlf)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(serializeDocument(parsed.document, parsed.document.value)).toBe(crlf)
  })

  it("returns an empty tree diff for identical commits (backend contract)", async () => {
    const head = "a".repeat(40)
    const backend = new FixtureBackend({ headSha: head, treeSha: "b".repeat(40), files: new Map() })
    const diff = await backend.listChangedFiles("fixture", head, head)
    expect(diff.size).toBe(0)
  })
})

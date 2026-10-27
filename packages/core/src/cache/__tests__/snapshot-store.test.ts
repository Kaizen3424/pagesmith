import { describe, expect, it } from "vitest"
import { SnapshotStore } from "../snapshot-store"

const tree = { sha: "a".repeat(40), truncated: false, entries: [] }
const file = {
  path: "src/content/site.json",
  sha: "b".repeat(40),
  bytes: Uint8Array.from([1, 2, 3]),
  size: 3,
}

describe("SnapshotStore (P1.5 / INV-P08 foundation)", () => {
  it("advances only from the expected current head (stale results never win)", () => {
    const store = new SnapshotStore()
    expect(store.advance(undefined, "1".repeat(40))).toBe(true)
    expect(store.headSha).toBe("1".repeat(40))
    expect(store.advance(undefined, "2".repeat(40))).toBe(false)
    expect(store.advance("1".repeat(40), "2".repeat(40))).toBe(true)
    expect(store.headSha).toBe("2".repeat(40))
  })

  it("ignores empty/identical advances and supports explicit restore", () => {
    const store = new SnapshotStore()
    expect(store.advance(undefined, "")).toBe(false)
    expect(store.advance(undefined, "3".repeat(40))).toBe(true)
    expect(store.advance("3".repeat(40), "3".repeat(40))).toBe(false)
    store.forceHead("4".repeat(40))
    expect(store.headSha).toBe("4".repeat(40))
    expect(() => store.forceHead("")).toThrow(/empty/)
  })

  it("caches trees/blobs by immutable SHA (no mutable branch keys)", () => {
    const store = new SnapshotStore()
    store.putTree("c".repeat(40), { tree, etag: '"tree"' })
    store.putFile(file.sha, { file, etag: '"file"' })
    expect(store.getTree("c".repeat(40))?.etag).toBe('"tree"')
    expect(store.getFile(file.sha)?.file.bytes).toEqual(Uint8Array.from([1, 2, 3]))
    expect(store.getTree("d".repeat(40))).toBeUndefined()
    store.clear()
    expect(store.headSha).toBeUndefined()
    expect(store.getTree("c".repeat(40))).toBeUndefined()
  })
})

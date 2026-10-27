import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { loadFixtureRepoFromDisk } from "../fixture-repo"

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_ROOT = join(HERE, "..", "..", "..", "fixtures", "repo")

describe("fixture repo loader (yve-layout mirror)", () => {
  it("loads meta + content files from the shared fixture tree", async () => {
    const snapshot = await loadFixtureRepoFromDisk(FIXTURE_ROOT)
    expect(snapshot.headSha).toMatch(/^[0-9a-f]{40}$/)
    expect(snapshot.defaultBranch.length).toBeGreaterThan(0)
    expect(snapshot.files.size).toBeGreaterThan(0)
  })

  it("mirrors the target layout (src/content/**, public/images/**)", async () => {
    const snapshot = await loadFixtureRepoFromDisk(FIXTURE_ROOT)
    const paths = [...snapshot.files.keys()]
    expect(paths.some((p) => p.startsWith("src/content/"))).toBe(true)
    expect(paths.some((p) => p.startsWith("src/content/products/"))).toBe(true)
  })

  it("meta.json is parsed as metadata, never served as repo content", async () => {
    const snapshot = await loadFixtureRepoFromDisk(FIXTURE_ROOT)
    expect([...snapshot.files.keys()]).not.toContain("meta.json")
  })
})

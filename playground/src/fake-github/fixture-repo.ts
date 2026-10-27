/**
 * Fixture repository loader (node contexts) — playground owns the fixture
 * repo shape mirroring the yve layout (`src/content/**`, `public/images/**`)
 * so FakeGithub and the contract suite read one shared tree (ADR-0001).
 * Browser-side loading lands with P1 journeys; this module is the shared
 * definition point (01-spec §4: "MSW parity fixtures shared from
 * playground/fixtures").
 */
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

export interface FixtureRepoMeta {
  /** Fixture-visible default branch (data, not code — INV-P14). */
  readonly defaultBranch: string
  readonly headSha: string
}

export interface FixtureRepoSnapshot extends FixtureRepoMeta {
  /** Repo-relative POSIX-style paths → file content (utf8). */
  readonly files: ReadonlyMap<string, string>
}

/** Per-file cap mirrors the entry size law early (INV-S06 posture). */
const MAX_FILE_BYTES = 2 * 1024 * 1024

const SKIPPED_FILE_NAMES = new Set(["meta.json", ".gitkeep", ".keep"])

export async function loadFixtureRepoFromDisk(root: string): Promise<FixtureRepoSnapshot> {
  const meta = await readMeta(root, join(root, "meta.json"))
  const files = new Map<string, string>()
  await collect(root, "", files)
  return { ...meta, files }
}

/** @param {string} root @param {string} metaPath */
async function readMeta(root: string, metaPath: string): Promise<FixtureRepoMeta> {
  const raw = await readFile(metaPath, "utf8")
  const parsed = JSON.parse(raw) as Partial<FixtureRepoMeta>
  if (typeof parsed.defaultBranch !== "string" || parsed.defaultBranch === "") {
    throw new Error(`fixture meta at ${join(root, "meta.json")} needs a defaultBranch string`)
  }
  if (typeof parsed.headSha !== "string" || !/^[0-9a-f]{40}$/.test(parsed.headSha)) {
    throw new Error(`fixture meta at ${join(root, "meta.json")} needs a 40-hex headSha`)
  }
  return { defaultBranch: parsed.defaultBranch, headSha: parsed.headSha }
}

/** @param {string} absRoot @param {string} rel @param {Map<string, string>} files */
async function collect(absRoot: string, rel: string, files: Map<string, string>): Promise<void> {
  const dir = rel === "" ? absRoot : join(absRoot, rel)
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`
    if (entry.isDirectory()) {
      await collect(absRoot, childRel, files)
      continue
    }
    if (!entry.isFile() || SKIPPED_FILE_NAMES.has(entry.name)) continue
    const abs = join(absRoot, childRel)
    const bytes = await readFile(abs)
    if (bytes.byteLength > MAX_FILE_BYTES) {
      throw new Error(`fixture file exceeds the 2MB cap: ${childRel}`)
    }
    files.set(childRel.replace(/\\/g, "/"), bytes.toString("utf8"))
  }
}

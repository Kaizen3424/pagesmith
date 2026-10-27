/**
 * Fixture repository loader (node contexts) — playground owns the fixture repo
 * shape mirroring the yve layout (`src/content/**`, `public/images/**`) so
 * FakeGithub and the contract suite read one shared tree (ADR-0001).
 *
 * Files come from `scripts/sync-yve-fixtures.mjs`; the manifest pins git blob
 * SHAs, SHA-256, and the synthetic tree/head SHAs used by FakeGithub.
 */
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export interface FixtureRepoMeta {
  /** Fixture-visible default branch (data, not code — INV-P14). */
  readonly defaultBranch: string
  readonly headSha: string
  readonly treeSha: string
}

export interface FixtureRepoManifestEntry {
  readonly path: string
  readonly origin: "yve" | "drift"
  readonly bytes: number
  readonly sha: string
  readonly sha256: string
}

export interface FixtureRepoManifest {
  readonly source: string
  readonly sourceRepo: string
  readonly sourceCommit: string
  readonly defaultBranch: string
  readonly headSha: string
  readonly treeSha: string
  readonly files: readonly FixtureRepoManifestEntry[]
}

export interface FixtureRepoFile {
  readonly path: string
  readonly bytes: Uint8Array
  readonly sha: string
  readonly etag: string
}

export interface FixtureRepoSnapshot extends FixtureRepoMeta {
  /** Repo-relative POSIX paths → UTF-8 text (content files; binary images decode lossily). */
  readonly files: ReadonlyMap<string, string>
  /** Exact bytes + blob SHA + ETag for every fixture file. */
  readonly entries: ReadonlyMap<string, FixtureRepoFile>
  readonly manifest: FixtureRepoManifest
}

/** Per-file cap mirrors the entry size law early (INV-S06 posture). */
const MAX_FILE_BYTES = 2 * 1024 * 1024

const SKIPPED_FILE_NAMES = new Set([
  "meta.json",
  "manifest.json",
  "mockServiceWorker.js",
  ".gitkeep",
  ".keep",
])

export async function loadFixtureRepoFromDisk(root: string): Promise<FixtureRepoSnapshot> {
  const meta = await readMeta(root)
  const manifest = await readManifest(root)
  const entries = new Map<string, FixtureRepoFile>()
  const files = new Map<string, string>()

  for (const item of manifest.files) {
    const abs = join(root, item.path)
    const bytes = await readFile(abs)
    if (bytes.byteLength > MAX_FILE_BYTES) {
      throw new Error(`fixture file exceeds the 2MB cap: ${item.path}`)
    }
    entries.set(item.path, {
      path: item.path,
      bytes,
      sha: item.sha,
      etag: `"${item.sha}"`,
    })
    files.set(item.path, bytes.toString("utf8"))
  }

  return { ...meta, files, entries, manifest }
}

async function readMeta(root: string): Promise<FixtureRepoMeta> {
  const raw = await readFile(join(root, "meta.json"), "utf8")
  const parsed = JSON.parse(raw) as Partial<FixtureRepoMeta>
  if (typeof parsed.defaultBranch !== "string" || parsed.defaultBranch === "") {
    throw new Error(`fixture meta at ${join(root, "meta.json")} needs a defaultBranch string`)
  }
  if (typeof parsed.headSha !== "string" || !/^[0-9a-f]{40}$/.test(parsed.headSha)) {
    throw new Error(`fixture meta at ${join(root, "meta.json")} needs a 40-hex headSha`)
  }
  if (typeof parsed.treeSha !== "string" || !/^[0-9a-f]{40}$/.test(parsed.treeSha)) {
    throw new Error(`fixture meta at ${join(root, "meta.json")} needs a 40-hex treeSha`)
  }
  return { defaultBranch: parsed.defaultBranch, headSha: parsed.headSha, treeSha: parsed.treeSha }
}

async function readManifest(root: string): Promise<FixtureRepoManifest> {
  const raw = await readFile(join(root, "manifest.json"), "utf8")
  const parsed = JSON.parse(raw) as Partial<FixtureRepoManifest>
  if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error(
      `fixture manifest at ${join(root, "manifest.json")} needs a non-empty files array`,
    )
  }
  for (const item of parsed.files) {
    if (SKIPPED_FILE_NAMES.has(item.path.split("/").pop() ?? "")) {
      throw new Error(`fixture manifest must not list metadata files: ${item.path}`)
    }
    if (!/^[0-9a-f]{40}$/.test(item.sha)) {
      throw new Error(`fixture manifest entry ${item.path} needs a 40-hex git blob sha`)
    }
  }
  return parsed as FixtureRepoManifest
}

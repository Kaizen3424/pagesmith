/**
 * GithubBackend — hand-rolled fetch transport over the `FetchLike` seam.
 * ADR-0005 reads only in P1: refs, recursive trees, contents/blobs, tree diffs.
 * The token appears ONLY in the Authorization header; never in a URL.
 */

import { BackendReadError } from "../../backend/errors"
import type {
  CommitChangeSet,
  CommitResult,
  FileRead,
  GitBackend,
  GitBackendCapabilities,
  ReadFileOptions,
  ReadFileResult,
  ReadTreeOptions,
  ReadTreeResult,
  Ref,
  TreeEntryTuple,
} from "../../backend/types"
import type { FetchLike, FetchResponseLike } from "../../composition"
import { decodeBase64 } from "../../safety/encoding"
import type { JsonValue } from "../../safety/untrusted-json"
import { parseUntrustedJson } from "../../safety/untrusted-json"

export interface GithubBackendOptions {
  readonly owner: string
  readonly repo: string
  readonly token: string
  readonly fetch: FetchLike
  /** API origin override (tests/proxies); defaults to https://api.github.com. */
  readonly baseUrl?: string
}

const DEFAULT_BASE_URL = "https://api.github.com"
const API_VERSION = "2022-11-28"
const MAX_TREE_BYTES = 8 * 1024 * 1024
const CONTENTS_INLINE_LIMIT = 1_000_000

interface JsonResponse {
  readonly kind: "json"
  readonly value: JsonValue
  readonly etag?: string
}

interface NotModifiedResponse {
  readonly kind: "not-modified"
  readonly etag?: string
}

type RequestResult = JsonResponse | NotModifiedResponse

export class GithubBackend implements GitBackend {
  readonly capabilities: GitBackendCapabilities = { commitStatus: true, branches: true }
  readonly #owner: string
  readonly #repo: string
  readonly #token: string
  readonly #fetch: FetchLike
  readonly #baseUrl: string

  constructor(options: GithubBackendOptions) {
    this.#owner = options.owner
    this.#repo = options.repo
    this.#token = options.token
    this.#fetch = options.fetch
    this.#baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "")
  }

  async getRef(branch: string): Promise<Ref> {
    const url = `${this.#repoUrl()}/git/ref/heads/${encodeBranch(branch)}`
    const response = await this.#request(url)
    if (response.kind === "not-modified") {
      throw new BackendReadError(
        "UNKNOWN",
        "GitHub ref read returned 304 without a conditional request",
      )
    }
    const record = asRecord(response.value)
    const ref = getString(record, "ref")
    const object = asRecord(record?.object)
    const sha = getString(object, "sha")
    const type = getString(object, "type")
    if (ref === undefined || sha === undefined || type === undefined) {
      throw new BackendReadError("UNKNOWN", "GitHub ref response was malformed")
    }
    return { ref, object: { sha, type } }
  }

  async readTree(
    branch: string,
    commitSha: string,
    options: ReadTreeOptions = {},
  ): Promise<ReadTreeResult> {
    const sha =
      commitSha.length > 0 ? commitSha : (await this.getRef(requireBranch(branch))).object.sha
    const treeSha = await this.#resolveTreeSha(sha)
    const response = await this.#request(
      `${this.#repoUrl()}/git/trees/${treeSha}?recursive=1`,
      options.etag,
      MAX_TREE_BYTES,
      MAX_TREE_BYTES,
    )
    if (response.kind === "not-modified") {
      return {
        kind: "not-modified",
        ...(response.etag === undefined ? {} : { etag: response.etag }),
      }
    }

    const record = asRecord(response.value)
    const rootSha = getString(record, "sha") ?? treeSha
    const truncated = record?.truncated === true
    if (truncated) {
      const entries = await this.#walkSubtrees(treeSha, "")
      return {
        kind: "tree",
        tree: { sha: rootSha, truncated: false, entries },
        ...(response.etag === undefined ? {} : { etag: response.etag }),
      }
    }

    const tree = parseTreeEntries(record)
    return {
      kind: "tree",
      tree: { sha: rootSha, truncated: false, entries: tree },
      ...(response.etag === undefined ? {} : { etag: response.etag }),
    }
  }

  async readFile(
    branch: string,
    path: string,
    blobSha: string,
    options: ReadFileOptions = {},
  ): Promise<ReadFileResult> {
    const contentsUrl = `${this.#repoUrl()}/contents/${encodePath(path)}?ref=${encodeURIComponent(requireBranch(branch))}`
    const response = await this.#request(contentsUrl, options.etag)
    if (response.kind === "not-modified") {
      return {
        kind: "not-modified",
        ...(response.etag === undefined ? {} : { etag: response.etag }),
      }
    }

    const record = asRecord(response.value)
    if (record === undefined || Array.isArray(response.value)) {
      throw new BackendReadError("NOT_FOUND", `GitHub path is not a file: ${path}`)
    }
    if (record.type !== undefined && record.type !== "file") {
      throw new BackendReadError("NOT_FOUND", `GitHub path is not a file: ${path}`)
    }

    const size = getNumber(record, "size")
    const content = getString(record, "content")
    const encoding = getString(record, "encoding")
    const sha = getString(record, "sha") ?? blobSha

    if (size !== undefined && size > CONTENTS_INLINE_LIMIT) {
      const blob = await this.#readBlob(sha)
      return this.#fileResult(path, sha, blob, response.etag)
    }
    if (
      content === undefined ||
      content === "" ||
      (encoding !== undefined && encoding !== "base64")
    ) {
      if (sha.length > 0) {
        const blob = await this.#readBlob(sha)
        return this.#fileResult(path, sha, blob, response.etag)
      }
      throw new BackendReadError("UNKNOWN", `GitHub returned no content for ${path}`)
    }

    // Some responses are 200 with a 1MB+ blob marker but an empty content field.
    const bytes = decodeBase64(content)
    return this.#fileResult(path, sha, { bytes, size: size ?? bytes.length }, response.etag)
  }

  async listChangedFiles(
    branch: string,
    baseSha: string,
    headSha: string,
  ): Promise<ReadonlyMap<string, TreeEntryTuple>> {
    if (baseSha === headSha) return new Map()
    const [base, head] = await Promise.all([
      this.readTree(branch, baseSha),
      this.readTree(branch, headSha),
    ])
    if (base.kind !== "tree" || head.kind !== "tree") {
      throw new BackendReadError("UNKNOWN", "tree diff read unexpectedly returned not-modified")
    }
    const baseByPath = new Map(base.tree.entries.map((entry) => [entry.path, entry]))
    const changed = new Map<string, TreeEntryTuple>()
    for (const entry of head.tree.entries) {
      const previous = baseByPath.get(entry.path)
      if (
        previous === undefined ||
        previous.sha !== entry.sha ||
        previous.mode !== entry.mode ||
        previous.type !== entry.type
      ) {
        changed.set(entry.path, entry)
      }
    }
    return changed
  }

  async commitChanges(
    _changes: CommitChangeSet,
    _baseHeadSha: string,
    _branch: string,
  ): Promise<CommitResult> {
    throw new BackendReadError("UNKNOWN", "GithubBackend write path lands in P2 (ADR-0005 §writes)")
  }

  async #resolveTreeSha(commitSha: string): Promise<string> {
    try {
      const response = await this.#request(
        `${this.#repoUrl()}/git/commits/${encodeURIComponent(commitSha)}`,
      )
      if (response.kind === "not-modified") return commitSha
      const record = asRecord(response.value)
      const tree = asRecord(record?.tree)
      const sha = getString(tree, "sha")
      return sha ?? commitSha
    } catch (error) {
      if (error instanceof BackendReadError && error.code === "NOT_FOUND") {
        // Fixture/fake backends may hand back a tree sha directly.
        return commitSha
      }
      throw error
    }
  }

  async #walkSubtrees(treeSha: string, prefix: string): Promise<TreeEntryTuple[]> {
    const response = await this.#request(
      `${this.#repoUrl()}/git/trees/${encodeURIComponent(treeSha)}`,
      undefined,
      MAX_TREE_BYTES,
      MAX_TREE_BYTES,
    )
    if (response.kind === "not-modified") {
      throw new BackendReadError(
        "UNKNOWN",
        "subtree walk received 304 without a conditional request",
      )
    }
    const record = asRecord(response.value)
    if (record?.truncated === true) {
      throw new BackendReadError(
        "TREE_TRUNCATED",
        `subtree ${treeSha} is still truncated — cannot build a correct tree`,
      )
    }
    const entries: TreeEntryTuple[] = []
    for (const child of treeChildren(record)) {
      const childPath = prefix.length === 0 ? child.path : `${prefix}/${child.path}`
      if (child.type === "tree") {
        entries.push(...(await this.#walkSubtrees(child.sha, childPath)))
      } else if (child.type === "blob") {
        entries.push({
          path: childPath,
          sha: child.sha,
          mode: child.mode,
          type: child.type,
        })
      }
    }
    return entries
  }

  async #readBlob(sha: string): Promise<{ bytes: Uint8Array; size: number }> {
    const response = await this.#request(`${this.#repoUrl()}/git/blobs/${encodeURIComponent(sha)}`)
    if (response.kind === "not-modified") {
      throw new BackendReadError("UNKNOWN", "blob read received 304 without a conditional request")
    }
    const record = asRecord(response.value)
    const content = getString(record, "content")
    const size = getNumber(record, "size")
    if (content === undefined)
      throw new BackendReadError("UNKNOWN", "GitHub blob response had no content")
    const bytes = decodeBase64(content)
    return { bytes, size: size ?? bytes.length }
  }

  #fileResult(
    path: string,
    sha: string,
    blob: { bytes: Uint8Array; size: number },
    etag: string | undefined,
  ): ReadFileResult {
    const file: FileRead = {
      path,
      sha,
      bytes: blob.bytes,
      size: blob.size,
    }
    return { kind: "file", file, ...(etag === undefined ? {} : { etag }) }
  }

  async #request(
    url: string,
    etag?: string,
    maxBytes = 2 * 1024 * 1024,
    maxListItems = 5_000,
  ): Promise<RequestResult> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.#token}`,
      "X-GitHub-Api-Version": API_VERSION,
    }
    if (etag !== undefined) headers["If-None-Match"] = etag

    let response: FetchResponseLike
    try {
      response = await this.#fetch(url, { method: "GET", headers })
    } catch (error) {
      throw new BackendReadError(
        "NETWORK",
        error instanceof Error ? error.message : "network request failed",
      )
    }

    const responseEtag = response.headers.get("etag") ?? undefined
    if (response.status === 304) {
      return { kind: "not-modified", ...(responseEtag === undefined ? {} : { etag: responseEtag }) }
    }
    if (!response.ok) {
      throw classifyResponse(response)
    }

    const text = await response.text()
    const parsed = parseUntrustedJson(text, {
      maxBytes,
      maxListItems,
      maxDepth: 64,
    })
    if (!parsed.ok) {
      throw new BackendReadError(
        parsed.issues[0]?.code === "TOO_LARGE" ? "UNKNOWN" : "UNKNOWN",
        `GitHub response was not valid JSON: ${parsed.issues[0]?.detail ?? "unknown"}`,
        { status: response.status },
      )
    }
    return {
      kind: "json",
      value: parsed.value,
      ...(responseEtag === undefined ? {} : { etag: responseEtag }),
    }
  }

  #repoUrl(): string {
    return `${this.#baseUrl}/repos/${encodeURIComponent(this.#owner)}/${encodeURIComponent(this.#repo)}`
  }
}

function classifyResponse(response: FetchResponseLike): BackendReadError {
  const status = response.status
  const retryAfter = response.headers.get("retry-after") ?? undefined
  const remaining = response.headers.get("x-ratelimit-remaining")
  if (status === 401)
    return new BackendReadError("AUTH_EXPIRED", "GitHub token expired", { status })
  if (status === 403) {
    if (remaining === "0" || retryAfter !== undefined) {
      return new BackendReadError("RATE_LIMIT", "GitHub rate limit reached", {
        status,
        retryAfter,
      })
    }
    return new BackendReadError("SCOPE", "GitHub token lacks the required scope", { status })
  }
  if (status === 429) {
    return new BackendReadError("RATE_LIMIT", "GitHub rate limit reached", { status, retryAfter })
  }
  if (status === 404)
    return new BackendReadError("NOT_FOUND", "GitHub resource not found", { status })
  return new BackendReadError("UNKNOWN", `GitHub request failed (${status})`, { status })
}

function requireBranch(branch: string): string {
  if (branch.length === 0) throw new BackendReadError("UNKNOWN", "branch must not be empty")
  return branch
}

/** Encodes each branch segment, including `+` (INV-P14 branch-name test). */
export function encodeBranch(branch: string): string {
  return branch
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

function encodePath(path: string): string {
  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

function asRecord(value: JsonValue | undefined): Record<string, JsonValue> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined
  return value as Record<string, JsonValue>
}

function getString(record: Record<string, JsonValue> | undefined, key: string): string | undefined {
  const value = record?.[key]
  return typeof value === "string" ? value : undefined
}

function getNumber(record: Record<string, JsonValue> | undefined, key: string): number | undefined {
  const value = record?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

interface TreeChild {
  readonly path: string
  readonly sha: string
  readonly mode: string
  readonly type: string
}

function treeChildren(record: Record<string, JsonValue> | undefined): TreeChild[] {
  const tree = record?.tree
  if (!Array.isArray(tree)) return []
  const children: TreeChild[] = []
  for (const item of tree) {
    const child = asRecord(item)
    const path = getString(child, "path")
    const sha = getString(child, "sha")
    const mode = getString(child, "mode")
    const type = getString(child, "type")
    if (path !== undefined && sha !== undefined && mode !== undefined && type !== undefined) {
      children.push({ path, sha, mode, type })
    }
  }
  return children
}

function parseTreeEntries(record: Record<string, JsonValue> | undefined): TreeEntryTuple[] {
  return treeChildren(record)
    .filter((child) => child.type === "blob")
    .map((child) => ({ path: child.path, sha: child.sha, mode: child.mode, type: child.type }))
}

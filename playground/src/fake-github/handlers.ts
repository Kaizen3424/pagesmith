/**
 * MSW FakeGithub — P1.14 read-side handlers.
 *
 * Implements the GitHub endpoints GithubBackend + the capability probe touch:
 * repo, ref, commit, recursive tree (ETag/304/truncation chaos), contents,
 * blobs, rate_limit, protection, and check-runs. No write endpoints until P2.
 */
import { HttpResponse, http } from "msw"
import type { FixtureRepoFile, FixtureRepoSnapshot } from "./fixture-repo"

const API_ORIGIN = "https://api.github.com"

export interface FakeGithubTags {
  readonly owner: string
  readonly repo: string
}

export const DEFAULT_TAGS: FakeGithubTags = { owner: "mycms-fixtures", repo: "demo" }

export interface FakeGithubChaos {
  /** Return `truncated: true` on the recursive tree read (subtree fallback must save it). */
  readonly truncateTree?: boolean
  /** Return `truncated: true` on subtree reads too (loud INV-N02 failure). */
  readonly truncateSubtrees?: boolean
  /** Paths that return 404 from the contents route. */
  readonly notFoundPaths?: readonly string[]
  /** Return 429 once for the next request (quota chaos). */
  readonly rateLimitOnce?: boolean
}

export interface FakeGithubOptions {
  readonly chaos?: FakeGithubChaos
  /** When true, requests without a Bearer token get 401 (contract/probe tests). */
  readonly requireAuth?: boolean
}

export function createFakeGithubHandlers(
  snapshot: FixtureRepoSnapshot,
  tags: FakeGithubTags = DEFAULT_TAGS,
  options: FakeGithubOptions = {},
) {
  const repoPath = `${API_ORIGIN}/repos/${tags.owner}/${tags.repo}`
  const chaos = options.chaos ?? {}
  const treeEtag = `"tree-${snapshot.treeSha}"`
  const treeEntries = [...snapshot.entries.values()]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map((entry) => ({
      path: entry.path,
      mode: "100644",
      type: "blob" as const,
      sha: entry.sha,
      size: entry.bytes.byteLength,
    }))
  let rateLimited = false

  const guarded = (
    resolver: (args: Parameters<Parameters<typeof http.get>[1]>[0]) => Response | Promise<Response>,
  ) => {
    return (args: Parameters<Parameters<typeof http.get>[1]>[0]) => {
      if (
        options.requireAuth === true &&
        !args.request.headers.get("authorization")?.startsWith("Bearer ")
      ) {
        return HttpResponse.json(
          { message: "Bad credentials" },
          { status: 401, headers: rateHeaders() },
        )
      }
      if (chaos.rateLimitOnce === true && !rateLimited) {
        rateLimited = true
        return HttpResponse.json(
          { message: "API rate limit exceeded" },
          { status: 429, headers: { ...rateHeaders(), "retry-after": "30" } },
        )
      }
      return resolver(args)
    }
  }

  return [
    http.get(
      repoPath,
      guarded(() =>
        HttpResponse.json(
          {
            name: tags.repo,
            full_name: `${tags.owner}/${tags.repo}`,
            default_branch: snapshot.defaultBranch,
            private: true,
          },
          { headers: rateHeaders() },
        ),
      ),
    ),
    http.get(
      `${API_ORIGIN}/rate_limit`,
      guarded(() =>
        HttpResponse.json(
          {
            resources: {
              core: { limit: 5000, remaining: 4999, reset: Math.floor(Date.now() / 1000) + 3600 },
            },
          },
          { headers: rateHeaders() },
        ),
      ),
    ),
    http.get(
      `${repoPath}/branches/*/protection`,
      guarded(() =>
        HttpResponse.json({ required_status_checks: null }, { headers: rateHeaders() }),
      ),
    ),
    http.get(
      `${repoPath}/commits/*/check-runs`,
      guarded(() =>
        HttpResponse.json({ total_count: 0, check_runs: [] }, { headers: rateHeaders() }),
      ),
    ),
    http.get(
      `${repoPath}/git/ref/*`,
      guarded(({ request }) => {
        const branch = refBranch(request.url)
        if (branch === null) return notFound()
        return HttpResponse.json(
          {
            ref: `refs/heads/${branch}`,
            node_id: fixtureNodeId(branch),
            object: { sha: snapshot.headSha, type: "commit" },
          },
          { headers: rateHeaders() },
        )
      }),
    ),
    http.get(
      `${repoPath}/git/commits/:sha`,
      guarded(({ params }) => {
        if (String(params.sha) !== snapshot.headSha) return notFound()
        return HttpResponse.json(
          {
            sha: snapshot.headSha,
            tree: { sha: snapshot.treeSha },
          },
          { headers: rateHeaders() },
        )
      }),
    ),
    http.get(
      `${repoPath}/git/trees/:sha`,
      guarded(({ request, params }) => {
        if (String(params.sha) !== snapshot.treeSha) return notFound()
        const recursive = new URL(request.url).searchParams.get("recursive") === "1"
        const etag = recursive ? treeEtag : `"${snapshot.treeSha}-flat"`
        if (request.headers.get("if-none-match") === etag) {
          return new HttpResponse(null, { status: 304, headers: { etag } })
        }
        if (recursive && chaos.truncateTree === true) {
          return HttpResponse.json(
            { sha: snapshot.treeSha, truncated: true, tree: [] },
            { headers: { ...rateHeaders(), etag } },
          )
        }
        if (!recursive && chaos.truncateSubtrees === true) {
          return HttpResponse.json(
            { sha: snapshot.treeSha, truncated: true, tree: [] },
            { headers: { ...rateHeaders(), etag } },
          )
        }
        return HttpResponse.json(
          { sha: snapshot.treeSha, truncated: false, tree: treeEntries },
          { headers: { ...rateHeaders(), etag } },
        )
      }),
    ),
    http.get(
      `${repoPath}/contents/*`,
      guarded(({ request }) => {
        const path = contentsPath(request.url)
        if (path === null) return notFound()
        if (chaos.notFoundPaths?.includes(path) === true) return notFound()
        const entry = snapshot.entries.get(path)
        if (entry === undefined) return notFound()
        const etag = `"${entry.sha}"`
        if (request.headers.get("if-none-match") === etag) {
          return new HttpResponse(null, { status: 304, headers: { etag } })
        }
        if (entry.bytes.byteLength > 1_000_000) {
          return HttpResponse.json(
            {
              type: "file",
              sha: entry.sha,
              size: entry.bytes.byteLength,
              encoding: "none",
              content: "",
            },
            { headers: { ...rateHeaders(), etag } },
          )
        }
        return HttpResponse.json(
          {
            type: "file",
            sha: entry.sha,
            size: entry.bytes.byteLength,
            encoding: "base64",
            content: bytesToBase64(entry.bytes),
          },
          { headers: { ...rateHeaders(), etag } },
        )
      }),
    ),
    http.get(
      `${repoPath}/git/blobs/:sha`,
      guarded(({ params }) => {
        const entry = findEntryBySha(snapshot.entries, String(params.sha))
        if (entry === undefined) return notFound()
        return HttpResponse.json(
          {
            sha: entry.sha,
            size: entry.bytes.byteLength,
            encoding: "base64",
            content: bytesToBase64(entry.bytes),
          },
          { headers: rateHeaders() },
        )
      }),
    ),
  ]
}

function contentsPath(url: string): string | null {
  const marker = "/contents/"
  const index = url.indexOf(marker)
  if (index < 0) return null
  const encoded = url.slice(index + marker.length).split("?")[0] ?? ""
  try {
    return encoded
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/")
  } catch {
    return null
  }
}

function findEntryBySha(
  entries: ReadonlyMap<string, FixtureRepoFile>,
  sha: string,
): FixtureRepoFile | undefined {
  for (const entry of entries.values()) {
    if (entry.sha === sha) return entry
  }
  return undefined
}

/** Browser-safe base64 (no Buffer dependency). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

/** Branch names URL-decode here; malformed segments refuse (INV-P14 posture). */
function refBranch(url: string): string | null {
  const marker = "/git/ref/"
  const index = url.indexOf(marker)
  if (index < 0) return null
  const ref = url.slice(index + marker.length).split("?")[0] ?? ""
  const prefix = "heads/"
  if (!ref.startsWith(prefix)) return null
  try {
    return ref
      .slice(prefix.length)
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/")
  } catch {
    return null
  }
}

function notFound() {
  return HttpResponse.json({ message: "Not Found" }, { status: 404, headers: rateHeaders() })
}

/** Stable pseudo-node-id for a branch name (fixture determinism, sha-ish hex). */
function fixtureNodeId(branch: string): string {
  let hex = ""
  for (const char of `${branch}#node`) {
    hex += char.charCodeAt(0).toString(16).padStart(2, "0")
  }
  return (hex + hex).slice(0, 40)
}

function rateHeaders() {
  return {
    "x-ratelimit-limit": "5000",
    "x-ratelimit-remaining": "4999",
    "x-ratelimit-reset": "0",
  }
}

/**
 * MSW FakeGithub handler skeleton — the harness the core contract suite runs
 * against (ADR-0001). P0: repo-meta + ref endpoints driven by fixture data.
 * Behavioral surface (tree reads, blobs, ref updates, 409/422 chaos modes)
 * lands with P1.14.
 */
import { HttpResponse, http } from "msw"
import type { FixtureRepoSnapshot } from "./fixture-repo"

const API_ORIGIN = "https://api.github.com"

export interface FakeGithubTags {
  readonly owner: string
  readonly repo: string
}

export const DEFAULT_TAGS: FakeGithubTags = { owner: "mycms-fixtures", repo: "demo" }

export function createFakeGithubHandlers(
  snapshot: FixtureRepoSnapshot,
  tags: FakeGithubTags = DEFAULT_TAGS,
) {
  const repoPath = `${API_ORIGIN}/repos/${tags.owner}/${tags.repo}`
  return [
    http.get(repoPath, () =>
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
    http.get(`${repoPath}/git/ref/:ref`, ({ params }) => {
      const ref = String(params.ref)
      const branch = decodeBranch(ref)
      if (branch === null) return badRef()
      return HttpResponse.json(
        {
          ref: `refs/heads/${branch}`,
          node_id: fixtureNodeId(branch),
          object: { sha: snapshot.headSha, type: "commit" },
        },
        { headers: rateHeaders() },
      )
    }),
  ]
}

/** Branch names URL-decode here; malformed segments refuse (INV-P14 posture). */
function decodeBranch(ref: string): string | null {
  const prefix = "heads/"
  if (!ref.startsWith(prefix)) return null
  try {
    return decodeURIComponent(ref.slice(prefix.length))
  } catch {
    return null
  }
}

function badRef() {
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

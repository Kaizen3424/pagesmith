/// <reference types="node" />
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { GithubBackend } from "../../backends/github"
import type { FetchLike, FetchResponseLike } from "../../composition"
import { assertNotTruncated } from "../guards"

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_ROOT = resolve(HERE, "../../../../..", "playground", "fixtures", "repo")
const HEAD = "1".repeat(40)
const TREE = "2".repeat(40)
const SRC = "3".repeat(40)
const BLOB = "4".repeat(40)

function response(body: unknown, status = 200): FetchResponseLike {
  const text = JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "test",
    headers: { get: () => null },
    json: async () => JSON.parse(text),
    text: async () => text,
  }
}

function backend(handler: (url: string) => FetchResponseLike): GithubBackend {
  const fetch: FetchLike = async (url) => handler(url)
  return new GithubBackend({ owner: "o", repo: "r", token: "t", fetch })
}

describe("INV-N02 truncation fallback", () => {
  it("switches from a truncated recursive tree to a non-recursive subtree walk", async () => {
    const api = backend((url) => {
      if (url.includes("/git/commits/")) return response({ tree: { sha: TREE } })
      if (url.includes("?recursive=1")) return response({ sha: TREE, truncated: true, tree: [] })
      if (url.endsWith(`/git/trees/${TREE}`)) {
        return response({
          truncated: false,
          tree: [{ path: "src", type: "tree", mode: "040000", sha: SRC }],
        })
      }
      if (url.endsWith(`/git/trees/${SRC}`)) {
        return response({
          truncated: false,
          tree: [{ path: "site.json", type: "blob", mode: "100644", sha: BLOB }],
        })
      }
      return response({}, 404)
    })
    const read = await api.readTree("fixture", HEAD)
    expect(read.kind).toBe("tree")
    if (read.kind !== "tree") return
    expect(read.tree.truncated).toBe(false)
    expect(read.tree.entries).toEqual([
      { path: "src/site.json", sha: BLOB, mode: "100644", type: "blob" },
    ])
    expect(assertNotTruncated(read.tree).ok).toBe(true)
  })

  it("fails loudly when a subtree is still truncated", async () => {
    const api = backend((url) => {
      if (url.includes("/git/commits/")) return response({ tree: { sha: TREE } })
      if (url.includes("?recursive=1")) return response({ sha: TREE, truncated: true, tree: [] })
      return response({ sha: TREE, truncated: true, tree: [] })
    })
    await expect(api.readTree("fixture", HEAD)).rejects.toMatchObject({ code: "TREE_TRUNCATED" })
  })

  it("keeps the fixture mirror's JSON source under the recursive-tree entry budget", () => {
    const manifest = JSON.parse(readFileSync(join(FIXTURE_ROOT, "manifest.json"), "utf8")) as {
      files: readonly { path: string }[]
    }
    expect(manifest.files.length).toBeLessThan(100_000)
  })
})

import { describe, expect, it } from "vitest"
import { FixtureBackend, textFixtureFile } from "../../backends/reference-fixture-backend"
import { encodeUtf8 } from "../../safety/encoding"
import {
  CORE_CONTRACT_SUITE,
  defineContractSuite,
  runContractSuite,
  SHAPE_CHECK,
} from "../contract-suite"
import type { GitBackend } from "../types"

const HEAD = "2a".repeat(20)
const FILE_SHA = "b1".repeat(20)
const FILE_TEXT = '{\n  "title": "fixture"\n}\n'

function fixtureBackend(): FixtureBackend {
  return new FixtureBackend({
    headSha: HEAD,
    treeSha: "c0".repeat(20),
    etag: '"tree-etag"',
    files: new Map([
      ["src/content/site.json", textFixtureFile(FILE_TEXT, FILE_SHA, '"file-etag"')],
    ]),
  })
}

describe("contract suite runner (ADR-0001: one suite for every backend)", () => {
  it("reference-fixture-backend passes the full read-side suite", async () => {
    const report = await runContractSuite(fixtureBackend(), CORE_CONTRACT_SUITE, {
      expectedPaths: ["src/content/site.json"],
      expectedFileBytes: encodeUtf8(FILE_TEXT),
    })
    expect(report.ok).toBe(true)
    expect(report.passed).toBe(CORE_CONTRACT_SUITE.checks.length)
    expect(report.failures).toEqual([])
  })

  it("records named failures for malformed implementations", async () => {
    const bad = {
      capabilities: { commitStatus: 1, branches: true },
      getRef: async (branch: string) => ({ ref: branch, object: { sha: "", type: "" } }),
      listChangedFiles: async () => new Map(),
      commitChanges: async () => ({ commitSha: "", treeSha: "" }),
    } as unknown as GitBackend
    const report = await runContractSuite(bad, CORE_CONTRACT_SUITE)
    expect(report.ok).toBe(false)
    expect(report.failures[0]?.name).toBe(SHAPE_CHECK.name)
    expect(report.failures.some((failure) => failure.name === SHAPE_CHECK.name)).toBe(true)
  })

  it("supports bespoke suites; custom checks run in order", async () => {
    const observe: string[] = []
    const suite = defineContractSuite([
      { name: "first", run: async () => void observe.push("first") },
      {
        name: "second",
        run: async () => {
          observe.push("second")
        },
      },
    ])
    const backend = new FixtureBackend({ headSha: "3a".repeat(20) })
    const report = await runContractSuite(backend, suite)
    expect(report.ok).toBe(true)
    expect(observe).toEqual(["first", "second"])
  })
})

describe("FixtureBackend (ADR-0009 exemplar stub)", () => {
  it("branches are parameters — any branch works, none are hardcoded (INV-P14 posture)", async () => {
    const head = "4a".repeat(20)
    const stagingSha = "5b".repeat(20)
    const fixture = new FixtureBackend({ headSha: head })
    fixture.setBranchHead("staging", stagingSha)
    const staged = await fixture.getRef("staging")
    expect(staged.ref).toBe("refs/heads/staging")
    expect(staged.object.sha).toBe(stagingSha)
    const fallback = await fixture.getRef("whatever-branch-name")
    expect(fallback.object.sha).toBe(head)
  })

  it("write-path plumbing refuses loudly until P2 (typed stub refusal)", async () => {
    const fixture = new FixtureBackend({ headSha: "6c".repeat(20) })
    await expect(
      fixture.commitChanges({ deletes: ["x.json"] }, "6c".repeat(20), "staging"),
    ).rejects.toMatchObject({
      code: "STUB_NOT_IMPLEMENTED",
    })
  })
})

import type { GitBackend } from "../types";
import { CORE_CONTRACT_SUITE, defineContractSuite, runContractSuite, SHAPE_CHECK } from "../contract-suite";
import { FixtureBackend } from "../../backends/reference-fixture-backend";
import { describe, expect, it } from "vitest";

describe("contract suite runner (ADR-0001: one suite for every backend)", () => {
  it("reference-fixture-backend passes the shape check", async () => {
    const backend = new FixtureBackend({ headSha: "2a".repeat(20) });
    const report = await runContractSuite(backend, CORE_CONTRACT_SUITE);
    expect(report.ok).toBe(true);
    expect(report.passed).toBe(1);
    expect(report.failures).toEqual([]);
  });

  it("records named failures for malformed implementations", async () => {
    const bad = {
      capabilities: { commitStatus: 1, branches: true },
      getRef: async (branch: string) => ({ ref: branch, object: { sha: "", type: "" } }),
      listChangedFiles: async () => new Map(),
      commitChanges: async () => ({ commitSha: "", treeSha: "" }),
    } as unknown as GitBackend;
    const report = await runContractSuite(bad, CORE_CONTRACT_SUITE);
    expect(report.ok).toBe(false);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0]?.name).toBe(SHAPE_CHECK.name);
  });

  it("supports bespoke suites; custom checks run in order", async () => {
    const observe: string[] = [];
    const suite = defineContractSuite([
      { name: "first", run: async () => void observe.push("first") },
      { name: "second", run: async () => { observe.push("second"); } },
    ]);
    const backend = new FixtureBackend({ headSha: "3a".repeat(20) });
    const report = await runContractSuite(backend, suite);
    expect(report.ok).toBe(true);
    expect(observe).toEqual(["first", "second"]);
  });
});

describe("FixtureBackend (ADR-0009 exemplar stub)", () => {
  it("branches are parameters — any branch works, none are hardcoded (INV-P14 posture)", async () => {
    const head = "4a".repeat(20);
    const stagingSha = "5b".repeat(20);
    const fixture = new FixtureBackend({ headSha: head });
    fixture.setBranchHead("staging", stagingSha);
    const staged = await fixture.getRef("staging");
    expect(staged.ref).toBe("refs/heads/staging");
    expect(staged.object.sha).toBe(stagingSha);
    const fallback = await fixture.getRef("whatever-branch-name");
    expect(fallback.object.sha).toBe(head);
  });

  it("write-path plumbing refuses loudly until P2 (typed stub refusal)", async () => {
    const fixture = new FixtureBackend({ headSha: "6c".repeat(20) });
    await expect(fixture.commitChanges({ deletes: ["x.json"] }, "6c".repeat(20), "staging")).rejects.toMatchObject({
      code: "STUB_NOT_IMPLEMENTED",
    });
  });
});

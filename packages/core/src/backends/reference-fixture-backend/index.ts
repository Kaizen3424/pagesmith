/**
 * Reference-fixture backend stub — ADR-0009 exemplar 2.
 *
 * Zero-network GitBackend over fixture trees. Its acceptance gate is passing
 * the SAME shared contract suite as GithubBackend (ADR-0009 §4). P0 stub:
 * shape + capabilities + a recording getRef; plumbing lands P1 (reads) and
 * P2 (writes). The stub NEVER touches the network and never hard-codes a
 * branch name (branch is data, INV-P14).
 */
import type {
  CommitChangeSet,
  CommitResult,
  GitBackend,
  GitBackendCapabilities,
  Ref,
  TreeEntryTuple,
} from "../../backend/types"

/** Typed refusal for unimplemented P0 plumbing — callers switch on `code`. */
export class ContractStubNotImplementedError extends Error {
  override readonly name = "ContractStubNotImplementedError"
  /** `readonly code` as a literal to keep the failure class machine-matchable. */
  readonly code = "STUB_NOT_IMPLEMENTED"

  constructor(what: string) {
    super(`reference-fixture-backend (P0 stub) not implemented: ${what}`)
  }
}

export interface FixtureRepoSpec {
  /** Head commit sha of the fixture tree (data, not a code literal). */
  readonly headSha: string
  readonly capabilities?: Partial<GitBackendCapabilities>
}

export class FixtureBackend implements GitBackend {
  readonly #branchHeads = new Map<string, string>()
  readonly #spec: FixtureRepoSpec

  constructor(spec: FixtureRepoSpec) {
    this.#spec = spec
  }

  /** Test hook for future ref-state plumbing (P1/P2). */
  setBranchHead(branch: string, sha: string): void {
    this.#branchHeads.set(branch, sha)
  }

  get capabilities(): GitBackendCapabilities {
    return { commitStatus: true, branches: true, ...this.#spec.capabilities }
  }

  async getRef(branch: string): Promise<Ref> {
    const sha = this.#branchHeads.get(branch) ?? this.#spec.headSha
    return { ref: `refs/heads/${branch}`, object: { sha, type: "commit" } }
  }

  async listChangedFiles(
    _baseSha: string,
    _headSha: string,
  ): Promise<ReadonlyMap<string, TreeEntryTuple>> {
    throw new ContractStubNotImplementedError(
      "listChangedFiles (tree set-diff) lands with the P1 read path — ADR-0005 §reads",
    )
  }

  async commitChanges(
    _changes: CommitChangeSet,
    _baseHeadSha: string,
    _branch: string,
  ): Promise<CommitResult> {
    throw new ContractStubNotImplementedError(
      "commitChanges (blobs→tree→commit→FF-updateRef) lands with the P2 write path — ADR-0005 §writes",
    )
  }
}

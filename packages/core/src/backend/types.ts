/**
 * GitBackend contract — ADR-0005.
 *
 * Transport law: this is the ONLY GitHub surface core knows about. Transactional
 * git-data commits (blobs → tree with `base_tree` → commit → FF-only `updateRef`).
 * Branch is a parameter on EVERY method — zero hard-coded branch names anywhere
 * in backend/pipeline (INV-P14, standing veto on `main` literals).
 */

export interface RefObject {
  readonly sha: string
  readonly type: string
}

export interface Ref {
  readonly ref: string
  readonly object: RefObject
}

/** Tuple equality is `{sha, mode, type}` — mode/type-only foreign drift is never silently applied (INV-P06). */
export interface TreeEntryTuple {
  readonly sha: string
  readonly mode: string
  readonly type: string
}

/** Recursive root-tree read result (ADR-0005 §reads). Callers MUST run `assertNotTruncated` (INV-N02). */
export interface TreeRead {
  readonly sha: string
  readonly truncated: boolean
  readonly entries: readonly TreeEntryTuple[]
}

export interface FileWrite {
  readonly path: string
  /** Serialized bytes — the canonical serializer (P1) owns encoding; the backend never re-serializes. */
  readonly bytes: Uint8Array
}

export interface CommitChangeSet {
  readonly adds?: readonly FileWrite[]
  readonly updates?: readonly FileWrite[]
  /** Deletions are repo-relative paths (safePath-validated upstream, ADR-0006). */
  readonly deletes?: readonly string[]
}

export interface CommitResult {
  readonly commitSha: string
  readonly treeSha: string
}

/**
 * Capability object — exhaustive, compile-time literal (ADR-0005 §capabilities):
 * adding a key here breaks every backend implementation until it declares it.
 * Optional method-shaped capabilities are accessed ONLY after a capability check.
 */
export interface GitBackendCapabilities {
  /** Check-runs deploy-status pipeline usable with this token (ADR-0008). */
  readonly commitStatus: boolean
  /** Branch listing/mutability checks (FF-only CAS) apply. */
  readonly branches: boolean
}

export interface GitBackend {
  readonly capabilities: GitBackendCapabilities
  getRef(branch: string): Promise<Ref>
  listChangedFiles(baseSha: string, headSha: string): Promise<ReadonlyMap<string, TreeEntryTuple>>
  commitChanges(
    changes: CommitChangeSet,
    baseHeadSha: string,
    branch: string,
  ): Promise<CommitResult>
}

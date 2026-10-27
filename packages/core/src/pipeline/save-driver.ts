/**
 * Save driver — the pipeline entry point above `GitBackend.commitChanges`
 * (ADR-0005 P2 addendum; ADR-0004 laws: fresh `getRef` before EVERY save,
 * confirmation by content, drafts deleted only post-ref-verify [C.3]).
 *
 * C.1 mechanics:
 * 1. skip-token law rejects user messages BEFORE any network call (INV-D02).
 * 2. Fresh base ref + fresh base tree — challenge decisions NEVER consult a
 *    cache (no conditional headers on driver reads — INV-P08 posture; the
 *    formal cache-poisoning proof lands with the C.2 engine).
 * 3. Zero-diff changesets emit ZERO writes and end as `noop` (INV-S02 C.1).
 * 4. `commitChanges` failures classify: CAS → typed conflict verdict (fresh
 *    challenge reads); auth/scope/422-validation → after-write hook fires
 *    (INV-A03 wiring completes at P2.5); rate → typed FAILED carrying
 *    Retry-After/reset (INV-N01; parking lands C.3); network-class →
 *    verify-then-rebuild (INV-P09): fresh ref → done (content-confirmed
 *    publish, INV-P10) / rebuild with the SAME verified base / conflict.
 * Rebuild is never a blind replay: every attempt re-enters the CAS primitive
 * whose parent chain pins the verified head.
 */

import type { BackendReadError } from "../backend/errors"
import { gitBlobSha } from "../backend/git-sha"
import type { CommitChangeSet, CommitResult, GitBackend, TreeEntryTuple } from "../backend/types"
import {
  BackendWriteError,
  isBackendWriteError,
  type WriteErrorCode,
} from "../backend/write-errors"
import { composeCommitMessage } from "./commit-message"
import { isZeroDiffChangeSet } from "./zero-diff"

export interface SaveConflictDetails {
  /** Head the failed attempt was pinned to. */
  readonly baseHeadSha: string
  /** Freshly read head at decision time ("" only when the read itself failed). */
  readonly currentHeadSha: string
  /** Fresh base→head changed files (INV-P05 tuple domain, C.2 engine input). */
  readonly changed: ReadonlyMap<string, TreeEntryTuple>
}

export type SaveVerdict =
  | { readonly kind: "published"; readonly commitSha: string; readonly treeSha?: string }
  | { readonly kind: "noop" }
  | { readonly kind: "conflict"; readonly details: SaveConflictDetails }
  /** Terminal for this driver call: RATE_LIMIT parks (C.3), others surface. */
  | { readonly kind: "failed"; readonly error: BackendWriteError }

export interface SaveDriverInput {
  readonly backend: GitBackend
  readonly branch: string
  readonly changes: CommitChangeSet
  /** User-editable message; skip-token carrying input is rejected (INV-D02). */
  readonly message?: string
  /** After-write failure hook (401/403/422-class codes) — admin re-probes (INV-A03). */
  readonly onAfterWriteFailure?: (error: BackendWriteError) => void
  /** Unknown-outcome verify-then-rebuild budget (INV-P09). Default 2. */
  readonly maxRebuilds?: number
}

const REBUILDABLE_CODES: ReadonlySet<string> = new Set(["NETWORK", "UNKNOWN"])
/** 401/403/422-after-write re-probe pairing — CAS conflicts are UI machinery. */
const AFTER_WRITE_HOOK_CODES: ReadonlySet<string> = new Set(["AUTH_EXPIRED", "SCOPE", "VALIDATION"])

export async function runSave(input: SaveDriverInput): Promise<SaveVerdict> {
  const changeCount =
    (input.changes.adds?.length ?? 0) +
    (input.changes.updates?.length ?? 0) +
    (input.changes.deletes?.length ?? 0)
  const composed = composeCommitMessage({ count: changeCount, userMessage: input.message })
  if (!composed.ok) {
    // INV-D02: refusal happens with zero writes — the deploy is never muted.
    return {
      kind: "failed",
      error: new BackendWriteError(
        "VALIDATION",
        "commit message rejected: deploy-muting skip token (ADR-0008)",
        {},
      ),
    }
  }
  const maxRebuilds = input.maxRebuilds ?? 2

  // Fresh base binding — the ONE authority for this save (ADR-0004).
  const baseRef = await tryGetRef(input)
  if (typeof baseRef === "string") {
    return {
      kind: "failed",
      error: new BackendWriteError(baseRef as WriteErrorCode, "base ref read failed"),
    }
  }
  const baseHeadSha = baseRef.sha

  const baseTree = await tryReadTree(input, baseHeadSha)
  if (typeof baseTree === "string") {
    return {
      kind: "failed",
      error: new BackendWriteError(baseTree as WriteErrorCode, "base tree read failed"),
    }
  }
  if (await isZeroDiffChangeSet({ baseEntries: baseTree, changes: input.changes })) {
    return { kind: "noop" }
  }

  let lastError: BackendWriteError | undefined
  for (let attempt = 0; attempt <= maxRebuilds; attempt += 1) {
    let outcome: CommitResult
    try {
      outcome = await input.backend.commitChanges(input.changes, baseHeadSha, input.branch, {
        message: composed.message,
      })
    } catch (error) {
      const writeError = normalizeError(error)
      lastError = writeError
      if (AFTER_WRITE_HOOK_CODES.has(writeError.code)) {
        input.onAfterWriteFailure?.(writeError)
      }
      if (writeError.code === "CAS_CONFLICT") {
        return await conflictVerdict(input, baseHeadSha)
      }
      if (REBUILDABLE_CODES.has(writeError.code)) {
        const recovery = await classifyRecovery(input, baseHeadSha)
        if (recovery.kind === "published") return recovery
        if (recovery.kind === "conflict") {
          return {
            kind: "conflict",
            details: {
              baseHeadSha,
              currentHeadSha: recovery.currentHeadSha,
              changed: recovery.changed,
            },
          }
        }
        if (recovery.kind === "congested") continue // verified base unchanged → rebuild
        return { kind: "failed", error: recovery.error }
      }
      return { kind: "failed", error: writeError }
    }
    return {
      kind: "published",
      commitSha: outcome.commitSha,
      treeSha: outcome.treeSha,
    }
  }
  return {
    kind: "failed",
    error: lastError ?? new BackendWriteError("UNKNOWN", "save attempts exhausted", {}),
  }
}

type Recovery =
  | { readonly kind: "published"; readonly commitSha: string }
  | {
      readonly kind: "conflict"
      readonly baseHeadSha: string
      readonly currentHeadSha: string
      readonly changed: ReadonlyMap<string, TreeEntryTuple>
    }
  | { readonly kind: "congested" }
  | { readonly kind: "failed"; readonly error: BackendWriteError }

/**
 * INV-P09 classification: fresh ref decides done / rebuild / conflict. Never a
 * blind replay — every branch is proof-read against THE verified base sha.
 */
async function classifyRecovery(input: SaveDriverInput, baseHeadSha: string): Promise<Recovery> {
  const head = await tryGetRef(input)
  if (typeof head === "string") {
    return { kind: "congested" } // read died too — rebuild attempt resumes it
  }
  if (head.sha === baseHeadSha) return { kind: "congested" }
  const challenge = await remoteMatches(input, baseHeadSha, head.sha)
  if (challenge.matched) {
    return { kind: "published", commitSha: head.sha }
  }
  return {
    kind: "conflict",
    baseHeadSha,
    currentHeadSha: head.sha,
    changed: challenge.changed,
  }
}

/** One challenge: fresh diff decides confirmation AND carries conflict detail. */
async function remoteMatches(
  input: SaveDriverInput,
  baseHeadSha: string,
  headSha: string,
): Promise<{ readonly matched: boolean; readonly changed: ReadonlyMap<string, TreeEntryTuple> }> {
  const writes = [...(input.changes.adds ?? []), ...(input.changes.updates ?? [])]
  const deletes = input.changes.deletes ?? []
  try {
    const diff = await input.backend.listChangedFiles(input.branch, baseHeadSha, headSha)
    // Confirmation (ADR-0004 by-content): head's diff against OUR base equals
    // exactly our writes (sha-level, hence byte-exact) and our deletions hold.
    let matched = diff.size === writes.length
    for (const [, tuple] of diff) {
      const ours = writes.find((write) => write.path === tuple.path)
      if (ours === undefined || (await gitBlobSha(ours.bytes)) !== tuple.sha) {
        matched = false
        break
      }
    }
    if (matched && deletes.length > 0) {
      const headTree = await input.backend.readTree(input.branch, headSha)
      if (headTree.kind !== "tree") return { matched: false, changed: diff }
      const headPaths = new Set(headTree.tree.entries.map((entry) => entry.path))
      if (deletes.some((path) => headPaths.has(path))) {
        return { matched: false, changed: diff }
      }
    }
    return { matched, changed: diff }
  } catch {
    return { matched: false, changed: new Map() } // unverifiable ⇒ conflict re-probes
  }
}

async function conflictVerdict(input: SaveDriverInput, baseHeadSha: string): Promise<SaveVerdict> {
  const head = await tryGetRef(input)
  const currentHeadSha = typeof head === "string" ? "" : head.sha
  let changed: ReadonlyMap<string, TreeEntryTuple> = new Map()
  if (currentHeadSha.length > 0 && currentHeadSha !== baseHeadSha) {
    try {
      changed = await input.backend.listChangedFiles(input.branch, baseHeadSha, currentHeadSha)
    } catch {
      changed = new Map() // re-probe needed; details stay honest-and-empty
    }
  }
  return {
    kind: "conflict",
    details: { baseHeadSha, currentHeadSha, changed },
  }
}

/** All driver reads are UNCONDITIONAL (fresh-binding: never If-None-Match). */
async function tryGetRef(input: SaveDriverInput): Promise<{ sha: string } | string> {
  try {
    const ref = await input.backend.getRef(input.branch)
    return { sha: ref.object.sha }
  } catch (error) {
    return normalizeErrorCode(error)
  }
}

async function tryReadTree(
  input: SaveDriverInput,
  headSha: string,
): Promise<ReadonlyMap<string, TreeEntryTuple> | string> {
  try {
    const tree = await input.backend.readTree(input.branch, headSha)
    if (tree.kind !== "tree") {
      return "UNKNOWN" // impossible without a conditional request; kept typed
    }
    return new Map(tree.tree.entries.map((entry) => [entry.path, entry]))
  } catch (error) {
    return normalizeErrorCode(error)
  }
}

function normalizeErrorCode(error: unknown): string {
  const read = error as BackendReadError | undefined
  const code = read?.code
  if (typeof code === "string") return code
  return "UNKNOWN"
}

function normalizeError(error: unknown): BackendWriteError {
  if (isBackendWriteError(error)) return error
  const code = normalizeErrorCode(error)
  return new BackendWriteError(
    code === "NETWORK" ? "NETWORK" : "UNKNOWN",
    error instanceof Error ? error.message : "transport failed",
  )
}

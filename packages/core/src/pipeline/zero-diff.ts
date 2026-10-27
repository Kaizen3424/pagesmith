/**
 * Zero-diff gate — INV-S02 C.1 scope (ADR-0005 P2 addendum).
 *
 * A candidate changeset that would leave the tree byte-map IDENTICAL to the
 * fresh base tree must never produce a commit: content-addressing makes the
 * prospective tree sha equal to the base tree sha, so we skip the save before
 * any blob write (quota honesty: no-op saves cost nothing, which is what makes
 * ETag-variant false-changes impossible to commit by accident).
 */

import { gitBlobSha } from "../backend/git-sha"
import type { CommitChangeSet } from "../backend/types"

/**
 * True iff applying `changes` to the base tree map yields the SAME path→blob
 * sha map (add of an already-equal blob, update with identical bytes, delete of
 * an absent path all count as no-ops — the tree would not change byte-wise).
 */
export async function isZeroDiffChangeSet(input: {
  readonly baseEntries: ReadonlyMap<string, { readonly sha: string }>
  readonly changes: CommitChangeSet
}): Promise<boolean> {
  const prospective = new Map<string, string>()
  for (const [path, entry] of input.baseEntries) {
    prospective.set(path, entry.sha)
  }
  const writes = [...(input.changes.adds ?? []), ...(input.changes.updates ?? [])]
  for (const write of writes) {
    prospective.set(write.path, await gitBlobSha(write.bytes))
  }
  for (const path of input.changes.deletes ?? []) {
    // Deleting a path that never existed leaves the tree untouched.
    prospective.delete(path)
  }
  if (prospective.size !== input.baseEntries.size) return false
  for (const [path, entry] of input.baseEntries) {
    if (prospective.get(path) !== entry.sha) return false
  }
  return true
}

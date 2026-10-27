/**
 * Result type + truncation assert — ADR-0006 (Result-shaped, never throwing on
 * malformed transport reads) and INV-N02 setup: recursive tree reads must assert
 * `!truncated` before making correctness decisions. Wired into the GithubBackend
 * read path from P1; the utility exists NOW so P1 can only consume it.
 */

export interface ResultOk<T> {
  readonly ok: true;
  readonly value: T;
}

export interface ResultErr<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E> = ResultOk<T> | ResultErr<E>;

export interface ReadTreeLike {
  readonly truncated: boolean;
  readonly sha?: string;
}

export interface TreeTruncationIssue {
  readonly code: "TREE_TRUNCATED";
  readonly sha?: string;
  readonly detail: string;
}

/**
 * Truncation assert: `truncated: true` is a LOUD degradation signal (master-plan
 * TR5) — callers fall back to per-subtree non-recursive walks (INV-N02).
 */
export function assertNotTruncated<T extends ReadTreeLike>(read: T): Result<T, TreeTruncationIssue> {
  if (read.truncated) {
    return {
      ok: false,
      error: {
        code: "TREE_TRUNCATED",
        sha: read.sha,
        detail: "recursive tree read came back truncated — subtree-walk fallback required",
      },
    };
  }
  return { ok: true, value: read };
}

/**
 * Save pipeline vocabulary — ADR-0004 (one transition table, never scattered
 * booleans). The state machine + invariant engine + rebase() land in P2.4/P2.5.
 */

/** Exhaustive save phases (ADR-0004 §state machine). */
export const SAVE_PHASE_ORDER = [
  "editing",
  "dirty",
  "queued",
  "committing",
  "published",
  "conflict",
  "failed",
  "paused",
] as const;

export type SavePhase = (typeof SAVE_PHASE_ORDER)[number];

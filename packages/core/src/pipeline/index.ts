/**
 * Save pipeline vocabulary — ADR-0004 (one transition table, never scattered
 * booleans). The state machine + invariant engine + rebase() land in P2.4/P2.5.
 * C.1 mechanics: save driver, skip-token law, rate policy, zero-diff gate.
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
] as const

export type SavePhase = (typeof SAVE_PHASE_ORDER)[number]

export type { CommitMessageVerdict } from "./commit-message"
export { composeCommitMessage, containsSkipToken } from "./commit-message"
export type {
  ConcurrencyLimiter,
  RateDescriptor,
} from "./rate-policy"
export {
  createConcurrencyLimiter,
  createRateResume,
  describeRatePause,
  parseRateWindowReset,
  parseRetryAfter,
} from "./rate-policy"
export type { SaveConflictDetails, SaveDriverInput, SaveVerdict } from "./save-driver"
export { runSave } from "./save-driver"
export { isZeroDiffChangeSet } from "./zero-diff"

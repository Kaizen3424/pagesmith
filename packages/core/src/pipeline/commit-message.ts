/**
 * Commit-message law — ADR-0008 §4 + ADR-0005 P2 addendum.
 *
 * The CMS must never silently suppress its own deploy: the four documented
 * skip tokens ([skip ci]|[ci skip]|[no ci]|[skip actions]) are REFUSED in
 * user-editable messages, not stripped (rejecting keeps the failure visible;
 * stripping would match "silent bypass" posture the vetoes ban). Default
 * messages are machine-composed and skip-token-free by construction.
 * Pure L0 — no transport, no clock: inv-skip-token pins this pre-network.
 */

export type CommitMessageVerdict =
  | { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly code: "SKIP_TOKEN_REJECTED" }

const SKIP_TOKEN_PATTERNS: readonly RegExp[] = [
  /\[\s*skip\s+ci\s*\]/i,
  /\[\s*ci\s+skip\s*\]/i,
  /\[\s*no\s+ci\s*\]/i,
  /\[\s*skip\s+actions\s*\]/i,
]

/** True when the message would suppress the deploy we are about to trigger. */
export function containsSkipToken(message: string): boolean {
  return SKIP_TOKEN_PATTERNS.some((pattern) => pattern.test(message))
}

/**
 * Compose the save message: user-editable text wins, else the machine default
 * (`chore(cms): save N file(s)`). Rejection is a typed result — callers stop
 * before any network call and the admin message map renders founder prose.
 */
export function composeCommitMessage(input: {
  readonly count: number
  readonly userMessage?: string
}): CommitMessageVerdict {
  const userMessage = input.userMessage
  if (userMessage === undefined || userMessage.trim().length === 0) {
    return { ok: true, message: `chore(cms): save ${input.count} file(s)` }
  }
  if (containsSkipToken(userMessage) || containsSkipToken(userMessage.trim())) {
    return { ok: false, code: "SKIP_TOKEN_REJECTED" }
  }
  return { ok: true, message: userMessage.trim() }
}

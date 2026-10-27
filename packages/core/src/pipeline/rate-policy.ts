/**
 * Rate & concurrency policy — INV-N01 (ADR-0005 rate math + secondary limits).
 *
 * Rules in force:
 * - Writes pool at ≤5 concurrent transport calls (createBlob gate note).
 * - `Retry-After` and `X-RateLimit-Reset` are honored VERBATIM into typed
 *   errors; primary exhaustion surfaces a reset countdown instead of failing.
 * - Resume is EVENT-driven: timers schedule a wake, never busy-poll (the
 *   state machine in C.3 consumes `RatePauseSignal`).
 */

/** Concurrency gate: FIFO order, at most `max` tasks in flight at once. */
export interface ConcurrencyLimiter {
  run<T>(task: () => Promise<T>): Promise<T>
  readonly active: number
  readonly queued: number
}

export function createConcurrencyLimiter(max: number): ConcurrencyLimiter {
  if (!Number.isInteger(max) || max < 1) throw new Error("limiter max must be a positive integer")
  let active = 0
  const queue: Array<{
    task: () => Promise<unknown>
    resolve: (value: unknown) => void
    reject: (error: unknown) => void
  }> = []
  const pump = (): void => {
    while (active < max && queue.length > 0) {
      const head = queue.shift()
      if (head === undefined) return
      active += 1
      void head
        .task()
        .then(head.resolve, head.reject)
        .finally(() => {
          active -= 1
          pump()
        })
    }
  }
  const gate = max <= 0
  const run = <T>(task: () => Promise<T>): Promise<T> => {
    if (gate) return task() // disabled gate degrades to direct execution
    return new Promise<T>((resolve, reject) => {
      queue.push({
        task: task as () => Promise<T>,
        resolve: resolve as (value: unknown) => void,
        reject,
      })
      pump()
    })
  }
  return {
    run,
    get active(): number {
      return active
    },
    get queued(): number {
      return queue.length
    },
  }
}

/** Rate facts carried by typed RATE_LIMIT errors (BackendWriteError/ReadError). */
export interface RateDescriptor {
  readonly status?: number
  readonly retryAfter?: string
  readonly resetAt?: string
}

/** Parse numeric-or-HTTP-date Retry-After → wait milliseconds. */
export function parseRetryAfter(descriptor: RateDescriptor, now: () => number): number | null {
  if (descriptor.retryAfter === undefined) return null
  const seconds = Number(descriptor.retryAfter)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = new Date(descriptor.retryAfter)
  const time = date.getTime()
  if (!Number.isNaN(time)) return Math.max(0, time - now())
  return null
}

/** X-RateLimit-Reset epoch seconds → wait milliseconds (primary exhaustion). */
export function parseRateWindowReset(descriptor: RateDescriptor, now: () => number): number | null {
  if (descriptor.resetAt === undefined) return null
  const epochSeconds = Number(descriptor.resetAt)
  if (!Number.isFinite(epochSeconds)) return null
  return Math.max(0, epochSeconds * 1000 - now())
}

/**
 * The longest slot this descriptor asks us to stay quiet for. `null` = no
 * rate guidance (saving may retry immediately under policy backoff, not here).
 */
export function describeRatePause(descriptor: RateDescriptor, now: () => number): number | null {
  const retry = parseRetryAfter(descriptor, now)
  const reset = parseRateWindowReset(descriptor, now)
  if (retry === null && reset === null) return null
  return Math.max(retry ?? 0, reset ?? 0)
}

/**
 * Event-driven resume seam (INV-N01): a wake callback fires once after the
 * window; injections keep tests deterministic without real timers. The state
 * machine (C.3) owns how many resumes it allows.
 */
export function createRateResume(waitMs: number, wake: () => void): void {
  if (waitMs <= 0) {
    wake()
    return
  }
  const timer = setTimeout(wake, waitMs)
  if (typeof timer === "object" && timer !== null && "unref" in timer) {
    ;(timer as { unref?: () => void }).unref?.()
  }
}

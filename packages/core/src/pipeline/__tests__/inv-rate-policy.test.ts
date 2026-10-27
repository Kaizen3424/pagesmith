/// <reference types="node" />
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createConcurrencyLimiter,
  createRateResume,
  describeRatePause,
  parseRateWindowReset,
  parseRetryAfter,
} from "../rate-policy"

/**
 * INV-N01 — rate & concurrency policy: writes pool at ≤5; Retry-After and
 * X-RateLimit-Reset are honored verbatim into wait math; resume is
 * event-driven (single scheduled wake, no polling).
 */

const NOW = 1_700_000_000_000

describe("INV-N01 — concurrency gate ≤5 (L0)", () => {
  it("runs at most 5 tasks in flight, FIFO, no dropped slots", async () => {
    const limiter = createConcurrencyLimiter(5)
    let inFlight = 0
    let peak = 0
    const order: number[] = []
    const started: number[] = []
    const runs = Array.from({ length: 12 }, (_, index) => async () => {
      started.push(index)
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1
      order.push(index)
    })
    await Promise.all([...runs.map((run) => limiter.run(run))])
    expect(peak).toBe(5)
    expect(order).toEqual([...order].sort((left, right) => left - right))
    expect(started).toEqual([...started].sort((left, right) => left - right))
  })

  it("queued counter reflects pending admission", async () => {
    const limiter = createConcurrencyLimiter(1)
    const release: Array<() => void> = []
    const first = limiter.run(() => new Promise<void>((resolve) => void release.push(resolve)))
    expect(limiter.active).toBe(1)
    const second = limiter.run(async () => "second")
    expect(limiter.queued).toBe(1)
    void second
    release[0]?.()
    expect(await first).toBeUndefined()
    expect(await second).toBe("second")
  })
})

describe("INV-N01 — Retry-After / reset windows honored verbatim (L0)", () => {
  it("numeric Retry-After seconds convert to milliseconds", () => {
    expect(parseRetryAfter({ retryAfter: "30" }, () => NOW)).toBe(30_000)
    expect(parseRetryAfter({ retryAfter: "0" }, () => NOW)).toBe(0)
  })

  it("HTTP-date Retry-After converts relative to the injected clock", () => {
    const then = new Date(NOW + 45_000).toUTCString()
    expect(parseRetryAfter({ retryAfter: then }, () => NOW)).toBe(45_000)
    // Past dates clamp to zero, never negative.
    const past = new Date(NOW - 45_000).toUTCString()
    expect(parseRetryAfter({ retryAfter: past }, () => NOW)).toBe(0)
  })

  it("malformed Retry-After yields null (policy decides, not the dispatcher)", () => {
    expect(parseRetryAfter({ retryAfter: "soon-ish" }, () => NOW)).toBeNull()
    expect(parseRetryAfter({}, () => NOW)).toBeNull()
  })

  it("X-RateLimit-Reset epoch seconds convert against the clock", () => {
    const resetEpoch = (NOW + 120_000) / 1000
    expect(parseRateWindowReset({ resetAt: String(resetEpoch) }, () => NOW)).toBeCloseTo(120_000, 0)
    expect(parseRateWindowReset({}, () => NOW)).toBeNull()
    expect(parseRateWindowReset({ resetAt: "abc" }, () => NOW)).toBeNull()
  })

  it("describeRatePause takes the LONGEST of retry-after and reset", () => {
    const resetEpoch = (NOW + 900_000) / 1000
    expect(
      describeRatePause({ retryAfter: "30", resetAt: String(resetEpoch) }, () => NOW),
    ).toBeCloseTo(900_000, 0)
    expect(describeRatePause({ retryAfter: "30" }, () => NOW)).toBe(30_000)
    expect(describeRatePause({}, () => NOW)).toBeNull()
  })
})

describe("INV-N01 — event-driven resume (single scheduled wake)", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("zero-window wakes immediately, synchronously", () => {
    let wakes = 0
    createRateResume(0, () => {
      wakes += 1
    })
    expect(wakes).toBe(1)
  })

  it("scheduled wake fires once when the window elapses", () => {
    vi.useFakeTimers()
    let wakes = 0
    createRateResume(90_000, () => {
      wakes += 1
    })
    expect(wakes).toBe(0)
    vi.advanceTimersByTime(90_000)
    expect(wakes).toBe(1)
    vi.advanceTimersByTime(90_000)
    expect(wakes).toBe(1)
  })
})

import { describe, expect, it } from "vitest"
import { createLogger } from "../logger"

describe("logger masking (INV-A05)", () => {
  it("masks credential keys and every x-github-* header", () => {
    const logger = createLogger()
    logger.info("request prepared", {
      authorization: "Bearer ghp_secretstutyi",
      token: "whatever",
      secret: "aaa",
      password: "bbb",
      "x-github-target-url": "https://api.github.com/repos/o/r",
      "X-GitHub-Request-Id": "42",
      normal: 5,
    })
    const record = logger.history[0]
    expect(record?.message).toBe("request prepared")
    expect(record?.data).toEqual({
      authorization: "[masked]",
      token: "[masked]",
      secret: "[masked]",
      password: "[masked]",
      "x-github-target-url": "[masked]",
      "X-GitHub-Request-Id": "[masked]",
      normal: 5,
    })
  })

  it("re-masks token-shaped and email values inside strings", () => {
    const logger = createLogger()
    logger.warn(
      "call failed for github_pat_XYz123_456_789_ABCDEFg and legacy ghp_xA2cD3eF4gH5iJ6kL7mN8oP9; wrote to user@studio.example",
    )
    const record = logger.history[0]
    expect(record?.message).toBe("call failed for [token] and legacy [token]; wrote to [email]")
  })

  it("masking cascades through nested objects and arrays", () => {
    const logger = createLogger()
    logger.error("payload", { rows: [{ token: "abc" }, { ok: [1, 2] }] })
    const record = logger.history[0]
    expect(record?.data).toEqual({ rows: [{ token: "[masked]" }, { ok: [1, 2] }] })
  })

  it("ring buffer keeps newest records and evicts oldest (memory-only)", () => {
    const logger = createLogger(3)
    logger.info("m1")
    logger.info("m2")
    logger.info("m3")
    logger.info("m4")
    logger.info("m5")
    expect(logger.history).toHaveLength(3)
    const messages = logger.history.map((entry) => entry.message)
    expect(messages).toEqual(["m3", "m4", "m5"])
  })

  it("history snapshots are isolated copies (callers cannot mutate the buffer)", () => {
    const logger = createLogger(4)
    logger.info("first")
    const snapshot = logger.history
    logger.info("second")
    expect(snapshot).toHaveLength(1)
    expect(logger.history).toHaveLength(2)
  })
})

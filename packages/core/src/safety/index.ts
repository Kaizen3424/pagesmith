/** Safety module barrel — masked logger + (P1+) safePath/safeUrl/mustache-lite/collator/slug. */

export type { Logger, LogLevel, LogRecord } from "./logger"
export { createLogger, isSensitiveKey, maskData, maskString } from "./logger"

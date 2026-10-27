#!/usr/bin/env node
/**
 * Prod-purity byte-scan (INV-N04) — walks the built admin dist and fails on
 * source maps / mock-service-worker bytes / telemetry endpoints. The admin
 * bundle is the artifact that carries a PAT-bearing origin, so it ships PURE.
 * Scope: packages/admin/dist (playground stays a dev-facing harness).
 */
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const DIST_ROOT = join(process.cwd(), "packages", "admin", "dist")
const FORBIDDEN_BYTES = [
  "sourceMappingURL",
  "mockServiceWorker",
  "sentry.io",
  "sentry-cdn.com",
  "datadoghq.com",
  "segment.io",
  "amplitude.com",
  "posthog.com",
]
const violations = []

/** @param {string} dir */
function walk(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    violations.push(`build output missing: ${dir}`)
    return
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(path)
      continue
    }
    if (!entry.isFile()) continue
    if (entry.name.endsWith(".map")) {
      violations.push(`source map file present: ${path}`)
      continue
    }
    const bytes = readFileSync(path)
    const text = bytes.toString("latin1")
    for (const forbidden of FORBIDDEN_BYTES) {
      if (text.includes(forbidden)) violations.push(`forbidden bytes "${forbidden}" in ${path}`)
    }
  }
}

walk(DIST_ROOT)

if (violations.length > 0) {
  console.error("prod-purity-scan: FAIL")
  for (const violation of violations) console.error(`  - ${violation}`)
  process.exit(1)
}
console.log("prod-purity-scan: OK — admin dist carries no maps/mock/service or telemetry bytes.")

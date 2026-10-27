#!/usr/bin/env node
/**
 * Audit waiver filter (P0.3) — reads `pnpm audit --json` from stdin, removes
 * advisories covered by security/audit-waivers.yml, and fails when anything
 * unwaived remains OR when any waiver is expired / exceeds the 90-day window.
 *
 * ADR-0010 §2.6 supply-chain law: waivers are audited, dated, owned and
 * short-lived. Zero entries = healthy. No remote I/O, no telemetry.
 *
 * Runs with ZERO installs (the scheduled audit job never runs pnpm install),
 * so it is dependency-free: the waiver file parses via scripts/yaml-subset.mjs
 * (fail-closed — a waiver file outside the guarded subset fails, never
 * mis-parses).
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseSubsetYaml } from "./yaml-subset.mjs"

const REPO_ROOT = process.cwd()
const WAIVERS_PATH = join(REPO_ROOT, "security", "audit-waivers.yml")
const MAX_WINDOW_DAYS = 90
const REQUIRED_FIELDS = ["id", "package", "range", "reason", "owner", "expires", "upstream"]

/** @param {string} message */
function fail(message) {
  console.error(`audit-waiver-filter: FAIL — ${message}`)
  process.exit(1)
}

/** @returns {Promise<string>} */
async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString("utf8")
}

/**
 * @param {unknown} auditOutput
 * Tolerant across npm-audit v1 (`advisories`: object) and v2 (`vulnerabilities`: array).
 */
function extractAdvisories(auditOutput) {
  if (auditOutput == null || typeof auditOutput !== "object") return []
  const obj = /** @type {Record<string, unknown>} */ (auditOutput)
  if (obj.advisories && typeof obj.advisories === "object") {
    return Object.values(/** @type {Record<string, unknown>} */ (obj.advisories))
  }
  if (Array.isArray(obj.vulnerabilities)) {
    return /** @type {Record<string, unknown>[]} */ (obj.vulnerabilities)
  }
  return []
}

/** @typedef {{ [field: string]: string | null }} WaiverFields */

/** @returns {WaiverFields[]} */
function loadWaivers() {
  /** @type {string} */
  let raw
  try {
    raw = readFileSync(WAIVERS_PATH, "utf8")
  } catch {
    fail(`waiver file unreadable: ${WAIVERS_PATH}`)
    return []
  }
  /** @type {ReturnType<typeof parseSubsetYaml> | undefined} */
  let root
  try {
    root = parseSubsetYaml("security/audit-waivers.yml", raw)
  } catch (error) {
    fail(
      `waiver file is outside the guarded YAML subset — ${error instanceof Error ? error.message : String(error)}`,
    )
    return []
  }
  const waiversNode = root.entries.get("waivers")
  // Flow `waivers: []` and block dash lists both arrive as kind 'list'.
  if (waiversNode == null || waiversNode.kind !== "list") {
    fail('waiver file must contain a top-level "waivers" array')
    return []
  }
  /** @type {WaiverFields[]} */
  const waivers = []
  const today = new Date()
  for (const item of waiversNode.items) {
    if (item.kind !== "map") fail(`waiver file: every waiver entry must be a mapping`)
    /** @type {WaiverFields} */
    const fields = {}
    for (const field of REQUIRED_FIELDS) {
      const value = item.entries.get(field)
      fields[field] = value != null && value.kind === "scalar" ? value.text : null
    }
    const id = fields.id ?? "(no id)"
    const missing = REQUIRED_FIELDS.filter((key) => fields[key] == null || fields[key] === "")
    if (missing.length > 0) {
      fail(`waiver ${id} missing fields: ${missing.join(", ")}`)
    }
    const expiry = new Date(/** @type {string} */ (fields.expires))
    if (Number.isNaN(expiry.getTime())) {
      fail(`waiver ${id} has an unreadable expires date: ${String(fields.expires)}`)
    }
    const daysOut = Math.round((expiry.getTime() - today.getTime()) / 86_400_000)
    if (daysOut < 0) fail(`waiver ${id} EXPIRED on ${fields.expires} — renew or remove it`)
    if (daysOut > MAX_WINDOW_DAYS) {
      fail(`waiver ${id} exceeds the ${MAX_WINDOW_DAYS}-day window (${fields.expires})`)
    }
    waivers.push(fields)
  }
  return waivers
}

const auditOutput = JSON.parse(await readStdin())
const waivers = loadWaivers()
const advisories = extractAdvisories(auditOutput)

/**
 * A waiver covers an advisory when the advisory id and package match.
 * @param {Record<string, unknown>} advisory
 * @param {WaiverFields[]} waivers
 */
function isWaived(advisory, waivers) {
  const id = String(advisory.id ?? "")
  const pkg = String(advisory.module_name ?? advisory.name ?? "")
  const vulnerableRange = String(advisory.vulnerable_versions ?? advisory.range ?? "")
  return waivers.some(
    (w) => w.id === id && w.package === pkg && (!w.range || w.range === vulnerableRange),
  )
}

if (advisories.length === 0) {
  console.log("audit-waiver-filter: OK — no advisories reported by `pnpm audit`.")
  process.exit(0)
}

const open = advisories.filter((advisory) => !isWaived(advisory, waivers))
if (open.length === 0) {
  console.log("audit-waiver-filter: OK — every advisory is covered by an in-window waiver.")
  process.exit(0)
}

console.error("audit-waiver-filter: FAIL — unwaived advisories:")
for (const advisory of open)
  console.error(`  - ${String(advisory.id ?? advisory.name ?? "unknown")}`)
process.exit(1)

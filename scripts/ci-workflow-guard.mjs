#!/usr/bin/env node
/**
 * CI workflow guard — ADR-0010 §2.6 least-privilege CI law, enforced FROM P0 on
 * our own workflows: every `uses:` pinned to a full commit SHA, banned trigger
 * keys (pull_request_target), and `permissions: contents: read` at the top
 * level AND for every job. Parses YAML structure; comments never count.
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { parse } from "yaml"

const WORKFLOWS_DIR = join(process.cwd(), ".github", "workflows")
const SHA_RE = /^[0-9a-f]{40}$/
const BANNED_TRIGGERS = new Set(["pull_request_target"])
/** @type {string[]} */
const problems = []

/** @param {string} message */
function issue(message) {
  problems.push(message)
}

/** @param {string} dir @returns {string[]} */
function listWorkflows(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isFile() && /\.ya?ml$/.test(entry)) out.push(path)
  }
  return out
}

for (const path of listWorkflows(WORKFLOWS_DIR)) {
  const text = readFileSync(path, "utf8")
  const rel = path.replace(/\\/g, "/").split("/").slice(-2).join("/")

  /** @type {Record<string, unknown> | null} */
  let doc = null
  try {
    doc = /** @type {Record<string, unknown>} */ (parse(text))
  } catch {
    issue(`${rel}: YAML parse failure`)
  }
  if (doc == null) continue

  const triggers = /** @type {Record<string, unknown> | undefined} */ (doc.on)
  if (triggers != null && typeof triggers === "object") {
    for (const triggerName of Object.keys(triggers)) {
      if (BANNED_TRIGGERS.has(triggerName)) {
        issue(`${rel}: trigger ${JSON.stringify(triggerName)} is banned (ADR-0010 §2.6)`)
      }
    }
  }

  const perms = /** @type {Record<string, unknown> | undefined} */ (doc.permissions)
  if (perms == null || perms.contents !== "read") {
    issue(`${rel}: top-level permissions must declare 'contents: read'`)
  }

  const jobs = /** @type {Record<string, unknown>} */ (doc.jobs ?? {})
  for (const [jobName, rawJob] of Object.entries(jobs)) {
    if (typeof rawJob !== "object" || rawJob == null) continue
    const job = /** @type {Record<string, unknown>} */ (rawJob)
    const jobPerms = /** @type {Record<string, unknown> | undefined} */ (job.permissions)
    if (jobPerms == null || jobPerms.contents !== "read") {
      issue(
        `${rel}: job ${JSON.stringify(jobName)} must declare 'permissions: contents: read' (job-level least privilege)`,
      )
    }
    const steps = job.steps
    if (!Array.isArray(steps)) continue
    for (const rawStep of steps) {
      if (typeof rawStep !== "object" || rawStep == null) continue
      const step = /** @type {Record<string, unknown>} */ (rawStep)
      const uses = step.uses
      if (typeof uses !== "string") continue
      if (uses.startsWith("./")) continue // local reusable workflows: our own code
      const at = uses.lastIndexOf("@")
      const ref = at >= 0 ? uses.slice(at + 1).trim() : ""
      if (!SHA_RE.test(ref)) {
        issue(`${rel}: step uses ${JSON.stringify(uses)} must pin a 40-hex commit SHA`)
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`ci-workflow-guard: FAIL — ${problems.length} violation(s):`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log("ci-workflow-guard: OK — SHA-pinned, least-privilege, no banned triggers.")

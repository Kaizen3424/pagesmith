#!/usr/bin/env node
/**
 * Audit waiver filter (P0.3) — reads `pnpm audit --json` from stdin, removes
 * advisories covered by security/audit-waivers.yml, and fails when anything
 * unwaived remains OR when any waiver is expired / exceeds the 90-day window.
 *
 * ADR-0010 §2.6 supply-chain law: waivers are audited, dated, owned and
 * short-lived. Zero entries = healthy. No remote I/O, no telemetry.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const REPO_ROOT = process.cwd();
const WAIVERS_PATH = join(REPO_ROOT, "security", "audit-waivers.yml");
const MAX_WINDOW_DAYS = 90;
const REQUIRED_FIELDS = ["id", "package", "range", "reason", "owner", "expires", "upstream"];

/** @param {string} message */
function fail(message) {
  console.error(`audit-waiver-filter: FAIL — ${message}`);
  process.exit(1);
}

/** @returns {Promise<string>} */
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * @param {unknown} auditOutput
 * Tolerant across npm-audit v1 (`advisories`: object) and v2 (`vulnerabilities`: array).
 */
function extractAdvisories(auditOutput) {
  if (auditOutput == null || typeof auditOutput !== "object") return [];
  const obj = /** @type {Record<string, unknown>} */ (auditOutput);
  if (obj["advisories"] && typeof obj["advisories"] === "object") {
    return Object.values(/** @type {Record<string, unknown>} */ (obj["advisories"]));
  }
  if (Array.isArray(obj["vulnerabilities"])) {
    return /** @type {Record<string, unknown>[]} */ (obj["vulnerabilities"]);
  }
  return [];
}

/** @returns {{ waivers: Record<string, unknown>[] }} */
function loadWaivers() {
  let raw;
  try {
    raw = readFileSync(WAIVERS_PATH, "utf8");
  } catch {
    fail(`waiver file unreadable: ${WAIVERS_PATH}`);
    return { waivers: [] };
  }
  /** @type {Record<string, unknown> | null} */
  const doc = parse(raw) ?? null;
  if (doc == null || typeof doc !== "object" || !Array.isArray(doc["waivers"])) {
    fail('waiver file must contain a top-level "waivers" array');
    return { waivers: [] };
  }
  const today = new Date();
  for (const w of /** @type {Record<string, unknown>[]} */ (doc["waivers"])) {
    const missing = REQUIRED_FIELDS.filter((key) => w[key] == null || w[key] === "");
    if (missing.length > 0) {
      fail(`waiver ${w["id"] ?? "(no id)"} missing fields: ${missing.join(", ")}`);
    }
    const expiry = new Date(/** @type {string} */ (w["expires"]));
    if (Number.isNaN(expiry.getTime())) {
      fail(`waiver ${w["id"]} has an unreadable expires date: ${String(w["expires"])}`);
    }
    const daysOut = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
    if (daysOut < 0) fail(`waiver ${w["id"]} EXPIRED on ${w["expires"]} — renew or remove it`);
    if (daysOut > MAX_WINDOW_DAYS) {
      fail(`waiver ${w["id"]} exceeds the ${MAX_WINDOW_DAYS}-day window (${w["expires"]})`);
    }
  }
  return { waivers: /** @type {Record<string, unknown>[]} */ (doc["waivers"]) };
}

const auditOutput = JSON.parse(await readStdin());
const { waivers } = loadWaivers();
const advisories = extractAdvisories(auditOutput);

/**
 * A waiver covers an advisory when the advisory id and package match.
 * @param {Record<string, unknown>} advisory
 */
function isWaived(advisory) {
  const id = String(advisory["id"] ?? "");
  const pkg = String(advisory["module_name"] ?? advisory["name"] ?? "");
  const vulnerableRange = String(advisory["vulnerable_versions"] ?? advisory["range"] ?? "");
  return waivers.some(
    (w) => w["id"] === id && w["package"] === pkg && (!w["range"] || w["range"] === vulnerableRange)
  );
}

if (advisories.length === 0) {
  console.log("audit-waiver-filter: OK — no advisories reported by `pnpm audit`.");
  process.exit(0);
}

const open = advisories.filter((advisory) => !isWaived(advisory));
if (open.length === 0) {
  console.log("audit-waiver-filter: OK — every advisory is covered by an in-window waiver.");
  process.exit(0);
}

console.error("audit-waiver-filter: FAIL — unwaived advisories:");
for (const advisory of open) console.error(`  - ${String(advisory["id"] ?? advisory["name"] ?? "unknown")}`);
process.exit(1);

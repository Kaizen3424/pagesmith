/**
 * Origin allowlist assertion — INV-N05 (active from day 1):
 * a catch-all route aborts ANY request outside the v1 allowlist
 * (`self` + api.github.com + blob:/data:), recording violations for specs to
 * assert on. This is the CI-enforceable "zero third-party runtime scripts"
 * law (master-plan §8.5).
 */
import type { Page } from "@playwright/test";

const ALLOWED_ORIGINS = new Set(["https://api.github.com"]);
const ALLOWED_PROTOCOLS = new Set(["blob:", "data:"]);

export interface OriginReport {
  /** Collected outside-of-allowlist origin URLs (never empty expectations). */
  violations(): readonly string[];
}

/** Installs the catch-all interceptor; call BEFORE page.goto(). */
export async function installOriginAllowlist(page: Page, appOrigin: string): Promise<OriginReport> {
  const violations: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (ALLOWED_PROTOCOLS.has(url.protocol)) return route.fallback();
    if (url.origin === appOrigin) return route.fallback();
    if (ALLOWED_ORIGINS.has(url.origin)) return route.fallback();
    violations.push(url.toString());
    return route.abort();
  });
  return { violations: () => [...violations] };
}

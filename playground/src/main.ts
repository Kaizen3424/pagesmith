import { allowRealGithub, REAL_TARGET_BANNER, REAL_TARGET_ENV } from "./fake-github/env-guard";

/** Vite-injected env (types via vite/client; prefix configured in vite.config). */
const viteEnv = import.meta.env as Record<string, string | boolean | undefined>;
const rawFlag = viteEnv[REAL_TARGET_ENV];
const realTarget = allowRealGithub({ [REAL_TARGET_ENV]: typeof rawFlag === "string" ? rawFlag : undefined });

/** Static harness shell — repo content NEVER renders through markup sinks (ADR-0006). */
const app = document.getElementById("app");
if (app === null) {
  const message = "playground host element missing";
  throw new Error(message);
}

const heading = document.createElement("h1");
heading.textContent = "MyCMS playground";

const subtitle = document.createElement("p");
subtitle.textContent = "FakeGithub harness (MSW) — contract-suite target. Real GitHub disabled unless MYCMS_ALLOW_REAL_GITHUB=1.";

const target = document.createElement(realTarget ? "p" : "span");
if (realTarget) {
  target.textContent = REAL_TARGET_BANNER;
}
if (!realTarget) {
  target.textContent = "target: fixture repo (offline)";
}

app.append(heading, subtitle, target);

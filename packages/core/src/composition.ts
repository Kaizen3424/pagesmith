/**
 * Composition root — ADR-0001: everything injected at ONE point. Core imports
 * NO concrete IDB/session/network implementations; those live behind
 * interfaces (core/web) and the backend seam. Node-safe by construction.
 */
import type { GitBackend } from "./backend/types";
import type { DraftStore } from "./drafts";
import type { Logger } from "./safety/logger";

/**
 * DOM/node lib-free fetch seam — MSW/e2e fakes satisfy it structurally; the
 * real github-client (P1) adapts `globalThis.fetch` into it, so nothing in
 * core imports DOM globals.
 */
export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export interface FetchRequestInitLike {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: string | Uint8Array;
}

export type FetchLike = (input: string, init?: FetchRequestInitLike) => Promise<FetchResponseLike>;

export interface CreateMyCMSDeps {
  /** Transactional backend (real GitHub, fixture mock, Stage-B GitLab). */
  readonly backend: GitBackend;
  /** Persistent storage seam (IDB drafts impl lives in core/web, browser-only). */
  readonly storage: DraftStore;
  /** Masked, memory-only logger (INV-A05). */
  readonly logger: Logger;
  /** Injectable clock — deterministic runs (P2 queued ms/invariants). */
  readonly clock: () => Date;
  /** Injectable fetch — MSW/e2e must wrap THIS seam, never patch globals. */
  readonly fetch: FetchLike;
}

export interface MyCMSInstance extends CreateMyCMSDeps {}

/**
 * P0: stores the deps verbatim. Boot ordering (probe → snapshot → drafts
 * replay) lands with P1/P2 per ADR-0001/0004.
 */
export function createMyCMS(deps: CreateMyCMSDeps): MyCMSInstance {
  return Object.freeze({ ...deps });
}

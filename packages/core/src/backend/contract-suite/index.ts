/**
 * Backend contract suite — ADR-0001.
 *
 * The SAME suite every backend implementation must pass (GithubBackend,
 * reference-fixture-backend exemplar, Stage-B GitLab — and the playground's
 * FakeGithub). P0 ships the runner + the shape check; behavioral checks land
 * per phase: read-side (truncation/pagination/rename classes) in P1,
 * write-side (ref-race/409/422/atomicity/chaos hooks) in P2.
 */
import type { GitBackend } from "../types";

export interface ContractContext {
  readonly backend: GitBackend;
}

export interface ContractCheck {
  readonly name: string;
  run(ctx: ContractContext): Promise<void>;
}

export interface ContractSuite {
  readonly name: "core-contract-suite";
  readonly checks: readonly ContractCheck[];
}

export interface ContractFailure {
  readonly name: string;
  readonly error: unknown;
}

export interface ContractReport {
  readonly passed: number;
  readonly failures: readonly ContractFailure[];
  readonly ok: boolean;
}

/** Marks and freezes a check list — the suite cannot grow silently at runtime. */
export function defineContractSuite(checks: readonly ContractCheck[]): ContractSuite {
  return { name: "core-contract-suite", checks: Object.freeze([...checks]) };
}

/** Executes checks sequentially against one backend implementation. */
export async function runContractSuite(
  backend: GitBackend,
  suite: ContractSuite,
): Promise<ContractReport> {
  const failures: ContractFailure[] = [];
  let passed = 0;
  for (const check of suite.checks) {
    try {
      await check.run({ backend });
      passed += 1;
    } catch (error) {
      failures.push({ name: check.name, error });
    }
  }
  return { passed, failures, ok: failures.length === 0 };
}

/**
 * P0 shape check: capabilities must be the exhaustive boolean object and the
 * three transactional methods must exist. Encode later laws as more checks.
 */
export const SHAPE_CHECK: ContractCheck = {
  name: "backend-shape/capabilities-and-methods",
  async run({ backend }) {
    const { capabilities } = backend;
    if (typeof capabilities !== "object" || capabilities === null) {
      throw new Error("capabilities must be an object (exhaustive literal, ADR-0005)");
    }
    for (const key of ["commitStatus", "branches"] as const) {
      if (typeof capabilities[key] !== "boolean") {
        throw new Error(`capabilities.${key} must be boolean (exhaustive literal object law)`);
      }
    }
    const requiredMethods = ["getRef", "listChangedFiles", "commitChanges"] as const;
    for (const method of requiredMethods) {
      if (typeof backend[method] !== "function") {
        throw new Error(`GitBackend implementation missing ${method}()`);
      }
    }
  },
};

export const CORE_CONTRACT_SUITE = defineContractSuite([SHAPE_CHECK]);

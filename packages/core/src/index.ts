/**
 * @mycms/core public entry — ADR-0001 (one composition root) + ADR-0010 §1
 * (naming appears here + docs headers only).
 *
 * P0 state: laws encoded as seams (interfaces, DI stubs, runner, masked
 * logger). Mechanisms land per the ADR roster: config P1.1, fields P1.2,
 * backend reads P1.4, pipeline P2, drafts P2.5, web adapters P2.5.
 */

export type { AuthKind, AuthProvider } from "./auth"
export type {
  ContractCheck,
  ContractContext,
  ContractFailure,
  ContractReport,
} from "./backend/contract-suite"
export {
  CORE_CONTRACT_SUITE,
  defineContractSuite,
  runContractSuite,
  SHAPE_CHECK,
} from "./backend/contract-suite"
export type { ReadTreeLike, Result, TreeTruncationIssue } from "./backend/guards"
export { assertNotTruncated } from "./backend/guards"
// backend / pipeline seams
export type {
  CommitChangeSet,
  CommitResult,
  FileWrite,
  GitBackend,
  GitBackendCapabilities,
  Ref,
  RefObject,
  TreeEntryTuple,
  TreeRead,
} from "./backend/types"
export type { FixtureRepoSpec } from "./backends/reference-fixture-backend"
export {
  ContractStubNotImplementedError,
  FixtureBackend,
} from "./backends/reference-fixture-backend"
export type { SnapshotRef } from "./cache"
// transport seam
export type {
  CreateMyCMSDeps,
  FetchLike,
  FetchRequestInitLike,
  FetchResponseLike,
  MyCMSInstance,
} from "./composition"
export { createMyCMS } from "./composition"

// config + drafts + auth + cache + web seams
export { CONFIG_SCHEMA_VERSION } from "./config"
export type { DraftKey, DraftRecord, DraftStore } from "./drafts"
// field vocabulary
export type { FieldTypeName } from "./fields"
export type { SavePhase } from "./pipeline"
// pipeline vocabulary
export { SAVE_PHASE_ORDER } from "./pipeline"
export type { Logger, LogLevel, LogRecord } from "./safety/logger"
// safety (masked logger)
export { createLogger } from "./safety/logger"
export type { WebKeyValueStore } from "./web"

/**
 * Cache law — master-plan §4.3.
 * Monotonic: the snapshot store advances only after a ref-verified commit;
 * ETag conditional GETs live inside queryFns; keys carry refSha.
 */

export type { FileCacheEntry, TreeCacheEntry } from "./snapshot-store"
export { SnapshotStore } from "./snapshot-store"

export interface SnapshotRef {
  readonly headSha: string
}

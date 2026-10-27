/**
 * Cache law — master-plan §4.3 (full store lands in P1.4/P1.5).
 * Monotonic: the snapshot store advances only after a ref-verified commit;
 * ETag conditional GETs live inside queryFns; keys carry refSha.
 */
export interface SnapshotRef {
  readonly headSha: string
}

/** Drafts seam — 01-spec §5 (ADR-0002: draft lifecycle is ORTHOGONAL to token lifecycle). */

/**
 * Key law (verbatim): entry drafts are keyed `${repo}/${collection}/${slug}`;
 * staged media tiles are stored alongside per-entry
 * (`${repo}/${collection}/${slug}/media/${n}`); settings documents are keyed
 * by file path.
 */
export type DraftKey = string;

export interface DraftRecord<T = unknown> {
  readonly key: DraftKey;
  readonly value: T;
  readonly savedAt: string;
}

/** Node-safe seam — the IDB implementation lives in `core/web` (browser-only). */
export interface DraftStore {
  get<T>(key: DraftKey): Promise<DraftRecord<T> | undefined>;
  put<T>(record: DraftRecord<T>): Promise<void>;
  delete(key: DraftKey): Promise<void>;
  list(prefix?: string): Promise<readonly DraftRecord[]>;
}

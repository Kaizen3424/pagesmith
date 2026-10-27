/**
 * Snapshot store — P1.5 / INV-P08 foundation.
 *
 * The verified head advances ONLY through `advance(expected, next)`: a stale
 * query result carrying an old expected head can never overwrite a newer one.
 * Trees and blobs are keyed by immutable SHAs; ETags live here (HTTP cache),
 * never in a second UI cache (React Query is the only UI cache).
 */
import type { FileRead, TreeRead } from "../backend/types"

export interface TreeCacheEntry {
  readonly tree: TreeRead
  readonly etag?: string
}

export interface FileCacheEntry {
  readonly file: FileRead
  readonly etag?: string
}

export class SnapshotStore {
  #headSha: string | undefined
  readonly #trees = new Map<string, TreeCacheEntry>()
  readonly #files = new Map<string, FileCacheEntry>()

  get headSha(): string | undefined {
    return this.#headSha
  }

  /**
   * Advances the verified head only when the caller's expected current head
   * still matches. Returns true when the head changed.
   */
  advance(expectedCurrent: string | undefined, next: string): boolean {
    if (this.#headSha !== expectedCurrent) return false
    if (next.length === 0 || next === this.#headSha) return false
    this.#headSha = next
    return true
  }

  /** Test/restore hook — deliberately explicit, never called by stale reads. */
  forceHead(sha: string): void {
    if (sha.length === 0) throw new Error("head sha cannot be empty")
    this.#headSha = sha
  }

  putTree(commitSha: string, entry: TreeCacheEntry): void {
    this.#trees.set(commitSha, entry)
  }

  getTree(commitSha: string): TreeCacheEntry | undefined {
    return this.#trees.get(commitSha)
  }

  putFile(blobSha: string, entry: FileCacheEntry): void {
    this.#files.set(blobSha, entry)
  }

  getFile(blobSha: string): FileCacheEntry | undefined {
    return this.#files.get(blobSha)
  }

  clear(): void {
    this.#headSha = undefined
    this.#trees.clear()
    this.#files.clear()
  }
}

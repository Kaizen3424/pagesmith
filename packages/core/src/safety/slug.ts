/**
 * Slug is VIRTUAL: derived from the entry filename, never stored in JSON.
 * `src/content/products/iris-no-7.json` → `iris-no-7`.
 */

export function deriveSlug(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, "/")
  const segment = normalized.slice(normalized.lastIndexOf("/") + 1)
  if (!segment.toLowerCase().endsWith(".json")) return null
  const slug = segment.slice(0, -".json".length)
  if (slug.length === 0 || slug === "." || slug === "..") return null
  if (slug.includes("/") || slug.includes("\\")) return null
  return slug
}

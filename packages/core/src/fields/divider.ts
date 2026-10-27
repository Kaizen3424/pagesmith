/** Field-level divider decoration (no stored value). */
import type { DividerDeclaration } from "./types"

export function divider(options: {
  readonly before: string
  readonly label?: string
}): DividerDeclaration {
  if (options.before.length === 0) throw new Error("divider: before is required")
  return { before: options.before, label: options.label }
}

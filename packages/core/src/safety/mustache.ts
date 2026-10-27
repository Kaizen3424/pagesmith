/**
 * Mustache-lite — `{{ fields.title }}` substitution for list summaries and
 * relation labels. Deliberately tiny: no partials, no logic, no HTML escaping
 * (values are rendered as TEXT NODES by callers; never as markup).
 */

const TOKEN = /\{\{\s*([A-Za-z0-9_$.[\]]+)\s*\}\}/g

export type TemplateValues = Readonly<Record<string, unknown>>

export function mustacheLite(template: string, values: TemplateValues): string {
  return template.replace(TOKEN, (_match, rawPath: string) => {
    const value = readPath(values, rawPath)
    if (value === null || value === undefined) return ""
    if (typeof value === "string") return value
    if (typeof value === "number" || typeof value === "boolean") return String(value)
    return ""
  })
}

/** Resolves `a.b[0].c` without eval; only own properties are visible. */
export function readPath(root: unknown, path: string): unknown {
  const tokens = tokenize(path)
  if (tokens === null) return undefined
  let current: unknown = root
  for (const token of tokens) {
    if (typeof token === "number") {
      if (!Array.isArray(current)) return undefined
      current = current[token]
      continue
    }
    if (!isRecord(current)) return undefined
    if (!Object.hasOwn(current, token)) return undefined
    current = current[token]
  }
  return current
}

function tokenize(path: string): readonly (string | number)[] | null {
  if (path.length === 0) return null
  const tokens: (string | number)[] = []
  let index = 0
  while (index < path.length) {
    if (path[index] === ".") return null
    if (path[index] === "[") {
      const close = path.indexOf("]", index + 1)
      if (close === -1) return null
      const raw = path.slice(index + 1, close)
      if (!/^\d+$/.test(raw)) return null
      tokens.push(Number(raw))
      index = close + 1
      if (index < path.length && path[index] !== "." && path[index] !== "[") return null
      if (path[index] === ".") index += 1
      continue
    }
    let end = index
    while (end < path.length && path[end] !== "." && path[end] !== "[") end += 1
    const key = path.slice(index, end)
    if (!/^[A-Za-z0-9_$]+$/.test(key)) return null
    tokens.push(key)
    if (path[end] === ".") index = end + 1
    else index = end
  }
  return tokens
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

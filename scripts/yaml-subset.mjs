/**
 * yaml-subset.mjs — fail-closed strict subset parser for repo law files.
 *
 * WHY THIS EXISTS: the law scanners (`ci-workflow-guard.mjs` — its pre-install
 * CI step — and `audit-waiver-filter.mjs` — zero-install scheduled job) MUST
 * run with no node_modules on disk, so they cannot import any package. Rather
 * than vendoring a full YAML implementation, they parse the exact subset our
 * law files are allowed to use and RED-flag everything else — a scanner that
 * silently mis-parses its law file is worse than one that stops.
 *
 * ALLOWED (block style only):
 *   - full-line comments (`#`) and trailing comments introduced by " #"
 *   - block mappings, indented exactly 2 spaces per level (odd = error)
 *   - block sequences: `-` dash items owned by an empty-valued key; the dash
 *     sits at the owning key's indent + 2 and the item's first key at +4
 *   - scalars: plain, single-quoted ('' escape), double-quoted (\" and \\ only)
 *   - scalar flow sequences: [a, b] (one level, scalar items only)
 *   - GitHub expressions ({{ ... }} / ${{ ... }}) — masked as opaque tokens,
 *     never inspected
 *   - sequence items are represented internally with reserved `__itemN__`
 *     keys and unwrapped before return — real files must NOT use keys
 *     matching /^__item\d+__$/ (rejected at parse time)
 *
 * FORBIDDEN (throws — the scan turns RED instead of guessing): tabs anywhere,
 * odd indentation, block scalars (`|`, `>`), anchors (`&`), aliases (`*`),
 * tags (`!`), directives (`%`), flow mappings (`{`), multi-doc (`---`, `...`),
 * bare `-` items, non-key lines inside mappings, quoted keys, unterminated or
 * unbalanced quotes, unbalanced flow sequences.
 *
 * @typedef {{ kind: 'map', entries: Map<string, LawNode> } |
 *           { kind: 'list', items: LawNode[] } |
 *           { kind: 'scalar', text: string }} LawNode
 */

/** Indentation depth guard (levels of 2 spaces). */
const MAX_DEPTH = 8

/** Reserved internal sequence-item keys; author files may not use them. */
const RESERVED_KEY_RE = /^__item\d+__$/

/** @param {string} message */
function bail(message) {
  throw new Error(message)
}

/** @typedef {{ cind: number, text: string, where: string }} PrepLine */

/**
 * Mask `${{ ... }}` / `{{ ... }}` spans with an opaque token so they never
 * trip the forbidden-character scans. Unclosed spans keep their `{` and get
 * red-flagged downstream.
 * @param {string} line
 */
function maskExpressions(line) {
  return line.replace(/\$?\{\{[^}]*\}\}/g, "EXPR")
}

/**
 * Strip a trailing comment (quote-aware): an unquoted `#` at line start or
 * preceded by whitespace begins a comment. Bails on unterminated quotes.
 * @param {string} line
 * @param {string} where
 */
function stripComment(line, where) {
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inSingle) {
      if (char === "'" && line[i + 1] === "'")
        i++ // '' escape
      else if (char === "'") inSingle = false
    } else if (inDouble) {
      if (char === "\\" && (line[i + 1] === '"' || line[i + 1] === "\\")) i++
      else if (char === '"') inDouble = false
    } else if (char === "'") {
      inSingle = true
    } else if (char === '"') {
      inDouble = true
    } else if (char === "#" && (i === 0 || line[i - 1] === " " || line[i - 1] === "\t")) {
      return line.slice(0, i)
    }
  }
  if (inSingle || inDouble) bail(`${where}: unterminated quote`)
  return line
}

/**
 * Whether text opens a mapping item (an unquoted `key:` line with the colon
 * followed by a space or end of text). Quoted text is a scalar, not a key.
 * @param {string} text
 */
function isKeyLine(text) {
  if (text[0] === '"' || text[0] === "'") return false
  const colon = text.indexOf(":")
  if (colon === -1) return false
  const next = text[colon + 1] ?? ""
  return next === " " || next === "\t" || next === ""
}

/**
 * Split `key: value` on the same colon rule as isKeyLine. Bails on quoted
 * mapping keys (out of subset); returns null when text is not a key line.
 * @param {string} text
 * @param {string} where
 * @returns {[string, string] | null}
 */
function splitKey(text, where) {
  if (text[0] === '"' || text[0] === "'") {
    bail(`${where}: quoted mapping keys are outside the guarded subset`)
  }
  const colon = text.indexOf(":")
  if (!isKeyLine(text)) return null
  const key = text.slice(0, colon).trim()
  if (key === "") bail(`${where}: empty mapping key`)
  return [key, text.slice(colon + 1).trim()]
}

/**
 * Count quote characters on a plain scalar; odd counts mean the value would
 * mis-parse as YAML, so it is out of subset instead of silently accepted.
 * @param {string} value
 * @param {string} quote char to count
 */
function oddQuoteCount(value, quote) {
  let count = 0
  for (const char of value) if (char === quote) count++
  return count % 2 === 1
}

/**
 * Parse a leaf value: quoted scalar, flow sequence, or plain scalar with the
 * forbidden-character scan. Input is already masked and comment-stripped.
 * @param {string} raw
 * @param {string} where
 * @returns {LawNode}
 */
function parseLeaf(raw, where) {
  const value = raw.trim()
  if (value === "") return { kind: "scalar", text: "" }

  if (value[0] === '"' || value[0] === "'") {
    const quote = value[0]
    if (value.length < 2 || value[value.length - 1] !== quote) {
      bail(`${where}: quoted scalar must end with the quote it opens`)
    }
    const body = value.slice(1, -1)
    if (quote === '"') {
      for (let i = 0; i < body.length; i++) {
        if (body[i] === "\\" && body[i + 1] !== '"' && body[i + 1] !== "\\") {
          bail(`${where}: only " escapes (\\" and \\\\) are allowed inside double quotes`)
        }
      }
      return { kind: "scalar", text: body.replaceAll('\\"', '"').replaceAll("\\\\", "\\") }
    }
    return { kind: "scalar", text: body.replaceAll("''", "'") }
  }

  if (value[0] === "[") return parseFlowSequence(value, where)

  // Plain scalar — one forbidden character anywhere means out of subset.
  const forbidden =
    /[&*{}]/.test(value) ||
    value.startsWith("|") ||
    value.startsWith(">") ||
    value.startsWith("- ") ||
    value.endsWith("|") ||
    value.endsWith(">") ||
    oddQuoteCount(value, "'") ||
    oddQuoteCount(value, '"')
  if (forbidden) {
    bail(`${where}: value ${JSON.stringify(value)} falls outside the guarded subset`)
  }
  return { kind: "scalar", text: value }
}

/**
 * Parse `[a, b]` — one level, scalar items only, no nesting inside.
 * @param {string} value
 * @param {string} where
 * @returns {LawNode}
 */
function parseFlowSequence(value, where) {
  if (value[value.length - 1] !== "]") bail(`${where}: flow sequence must end with ']'`)
  const body = value.slice(1, -1)
  if (body.trim() === "") return { kind: "list", items: [] }
  /** @type {LawNode[]} */
  const items = []
  let start = 0
  for (let i = 0; i < body.length; i++) {
    const char = body[i]
    if (char === "[" || char === "]" || char === "{" || char === "}") {
      bail(`${where}: nested flow collections are outside the guarded subset`)
    }
    if (char === ",") {
      const part = body.slice(start, i).trim()
      if (part === "") bail(`${where}: flow sequence has an empty item`)
      items.push(parseLeaf(part, where))
      start = i + 1
    }
  }
  const last = body.slice(start).trim()
  if (last !== "") items.push(parseLeaf(last, where))
  return { kind: "list", items }
}

/**
 * Line preprocessing: masking, comment stripping, indentation validation,
 * and block sequences rewritten into reserved-key wrapper entries.
 * @param {string} fileName
 * @param {string} text
 * @returns {PrepLine[]}
 */
function preprocess(fileName, text) {
  /** @type {PrepLine[]} */
  const out = []
  let counter = 0

  text.split("\n").forEach((rawLine, index) => {
    const where = `${fileName}:${index + 1}`
    let line = rawLine.replace(/\r$/, "")
    line = maskExpressions(line)
    line = stripComment(line, where)
    if (line.trim() === "") return

    if (/\t/.test(line)) bail(`${where}: tabs are outside the guarded subset`)
    const trimmed = line.trim()
    if (trimmed === "---" || trimmed === "...") {
      bail(`${where}: multi-document files are outside the guarded subset`)
    }
    if (trimmed.startsWith("%")) bail(`${where}: % directives are outside the guarded subset`)

    const indentMatch = /^( *)/.exec(line)
    const spaces = indentMatch ? indentMatch[0].length : 0
    if (spaces % 2 === 1) bail(`${where}: indentation must be a multiple of 2 spaces`)
    const depth = spaces / 2
    if (depth > MAX_DEPTH) bail(`${where}: mapping is nested too deeply`)
    const content = line.slice(spaces)

    if (content === "-") bail(`${where}: bare '-' items are outside the guarded subset`)
    if (content.startsWith("- ")) {
      const inner = content.slice(2).trim()
      if (inner === "") bail(`${where}: sequence item must have content`)
      const name = `__item${++counter}__`
      if (!isKeyLine(inner)) {
        // Scalar item: the synthetic key carries the scalar in one line.
        out.push({ cind: spaces, text: `${name}: ${inner}`, where })
        return
      }
      const parts = splitKey(inner, where)
      if (parts == null) bail(`${where}: unexpected sequence item shape`)
      if (RESERVED_KEY_RE.test(parts[0])) bail(`${where}: __item keys are reserved`)
      out.push({ cind: spaces, text: `${name}:`, where })
      out.push({ cind: spaces + 2, text: inner, where })
      return
    }

    // Plain mapping line; reserved keys are author territory and rejected.
    if (isKeyLine(content)) {
      const key = splitKey(content, where)
      if (key != null && RESERVED_KEY_RE.test(key[0])) {
        bail(`${where}: __item keys are reserved`)
      }
    }
    out.push({ cind: spaces, text: content, where })
  })

  return out
}

/**
 * Parse preprocessed lines into a block mapping starting at `ind`.
 * @param {PrepLine[]} lines
 * @param {number} i — lines[i] must exist with cind === ind
 * @param {number} ind
 * @returns {{ node: LawNode, end: number }}
 */
function parseMap(lines, i, ind) {
  const first = lines[i]
  if (first == null || first.cind !== ind) {
    bail(`${first ? first.where : "?"}: expected block mapping at indentation ${ind}`)
  }
  /** @type {Map<string, LawNode>} */
  const entries = new Map()
  while (i < lines.length && lines[i].cind === ind) {
    const line = lines[i]
    const parts = splitKey(line.text, line.where)
    if (parts == null) bail(`${line.where}: mappings need 'key: value' pairs`)
    const [key, value] = parts
    if (value === "") {
      const next = i + 1
      if (next < lines.length && lines[next].cind > ind) {
        if (lines[next].cind !== ind + 2) {
          bail(`${lines[next].where}: child of '${key}' must sit at exactly +2 indentation`)
        }
        if (!isKeyLine(lines[next].text)) {
          bail(`${lines[next].where}: expected 'key: value' under '${key}'`)
        }
        const child = parseMap(lines, next, ind + 2)
        entries.set(key, child.node)
        i = child.end
        continue
      }
      // Empty value with no deeper block: null in YAML — empty scalar here.
      entries.set(key, { kind: "scalar", text: "" })
      i = next
      continue
    }
    entries.set(key, parseLeaf(value, line.where))
    if (i + 1 < lines.length && lines[i + 1].cind > ind) {
      bail(`${lines[i + 1].where}: scalar value cannot own subsequent lines`)
    }
    i++
  }
  return { node: { kind: "map", entries }, end: i }
}

/**
 * Sequence representation unwrap: a mapping whose keys are ALL reserved
 * `__itemN__` names is a list in disguise. Applied recursively.
 * @param {LawNode} node
 * @returns {LawNode}
 */
function unwrapSequences(node) {
  if (node.kind === "map") {
    const keys = [...node.entries.keys()]
    if (keys.length > 0 && keys.every((key) => RESERVED_KEY_RE.test(key))) {
      return { kind: "list", items: [...node.entries.values()].map(unwrapSequences) }
    }
    /** @type {Map<string, LawNode>} */
    const unwrapped = new Map()
    for (const [key, value] of node.entries) unwrapped.set(key, unwrapSequences(value))
    return { kind: "map", entries: unwrapped }
  }
  if (node.kind === "list") {
    return { kind: "list", items: node.items.map(unwrapSequences) }
  }
  return node
}

/**
 * Parse a repo law file (guarded YAML subset) into a LawNode tree.
 * Throws (fail-closed) on anything outside the subset.
 * @param {string} fileName name used only for error messages
 * @param {string} text file contents
 * @returns {LawNode}
 */
export function parseSubsetYaml(fileName, text) {
  const lines = preprocess(fileName, text)
  if (lines.length === 0) bail("document is empty")
  if (lines[0].cind !== 0) bail("top level must start at zero indentation")
  const parsed = parseMap(lines, 0, 0)
  if (parsed.end !== lines.length) bail("incomplete parse — structure error")
  return unwrapSequences(parsed.node)
}

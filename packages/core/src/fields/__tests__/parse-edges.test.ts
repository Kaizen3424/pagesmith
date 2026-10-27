import { describe, expect, it } from "vitest"
import { parseEntry } from "../parse"
import type { FieldDescriptor } from "../types"

const media = { folder: "public/images", publicFolder: "/images" } as const

function parse(
  fields: readonly FieldDescriptor[],
  raw: unknown,
  filePath = "src/content/products/x.json",
) {
  return parseEntry({ fields, raw, filePath, media })
}

function codes(result: ReturnType<typeof parse>): string[] {
  return result.issues.map((issue) => issue.code)
}

describe("parseEntry edge branches (lenient read contract)", () => {
  it("reports a non-object root once and never throws", () => {
    for (const raw of [null, 3, "x", [1, 2]]) {
      const result = parse([], raw)
      expect(result.value).toEqual({})
      expect(result.issues).toEqual([
        {
          path: "",
          code: "TYPE_MISMATCH",
          message: "Entry must be a JSON object",
          severity: "error",
        },
      ])
    }
  })

  it("distinguishes missing required from missing optional and skips dividers", () => {
    const fields: FieldDescriptor[] = [
      { name: "title", type: "string", label: "Title", required: true },
      { name: "subtitle", type: "string", label: "Subtitle", required: false },
      { type: "divider", label: "Divider" },
    ]
    const result = parse(fields, {})
    expect(codes(result)).toEqual(["MISSING_REQUIRED"])
    expect(result.value).toEqual({})
    expect(result.untouched).toEqual({})
  })

  it("derives the virtual slug, ignores a raw slug key, and keeps it untouched", () => {
    const fields: FieldDescriptor[] = [
      { name: "slug", type: "slug", label: "Slug", required: false },
    ]
    const result = parse(fields, { slug: "authored-value" }, "src/content/products/iris-no-7.json")
    expect(result.value.slug).toBe("iris-no-7")
    expect(result.issues[0]?.code).toBe("VIRTUAL_KEY_IGNORED")
    expect(result.issues[0]?.severity).toBe("warning")
    expect(result.untouched).toEqual({ "/slug": "authored-value" })
  })

  it("omits a slug when the filename cannot produce one", () => {
    const fields: FieldDescriptor[] = [
      { name: "slug", type: "slug", label: "Slug", required: false },
    ]
    const result = parse(fields, {}, "src/content/products/.json")
    expect(result.value.slug).toBeUndefined()
  })

  it("checks string formats, lengths, and configured patterns", () => {
    const fields: FieldDescriptor[] = [
      { name: "email", type: "string", label: "Email", required: false, format: "email" },
      { name: "url", type: "string", label: "URL", required: false, format: "url" },
      { name: "short", type: "string", label: "Short", required: false, minLength: 3 },
      { name: "long", type: "string", label: "Long", required: false, maxLength: 3 },
      { name: "pattern", type: "string", label: "Pattern", required: false, pattern: "^[a-z]+$" },
      { name: "badPattern", type: "string", label: "Bad", required: false, pattern: "[" },
      { name: "text", type: "text", label: "Text", required: false, minLength: 4 },
    ]
    const result = parse(fields, {
      email: "nope",
      url: "ftp://example.com",
      short: "ab",
      long: "abcd",
      pattern: "ABC",
      badPattern: "anything",
      text: "abc",
    })
    expect(codes(result)).toEqual([
      "PATTERN_MISMATCH",
      "PATTERN_MISMATCH",
      "OUT_OF_RANGE",
      "OUT_OF_RANGE",
      "PATTERN_MISMATCH",
      "PATTERN_MISMATCH",
      "OUT_OF_RANGE",
    ])
    expect(result.value).toMatchObject({ email: "nope", pattern: "ABC" })
  })

  it("accepts valid email/url strings and text", () => {
    const fields: FieldDescriptor[] = [
      { name: "email", type: "string", label: "Email", required: false, format: "email" },
      { name: "url", type: "string", label: "URL", required: false, format: "url" },
      { name: "text", type: "text", label: "Text", required: false },
    ]
    const result = parse(fields, {
      email: "atelier@ingandyve.nl",
      url: "https://ingandyve.nl",
      text: "long form",
    })
    expect(result.issues).toEqual([])
  })

  it("checks numbers (finite, integer, min, max) and booleans", () => {
    const fields: FieldDescriptor[] = [
      { name: "finite", type: "number", label: "Finite", required: false },
      { name: "int", type: "number", label: "Int", required: false, int: true },
      { name: "min", type: "number", label: "Min", required: false, min: 2 },
      { name: "max", type: "number", label: "Max", required: false, max: 2 },
      { name: "bool", type: "boolean", label: "Bool", required: false },
    ]
    const result = parse(fields, {
      finite: Number.POSITIVE_INFINITY,
      int: 2.5,
      min: 1,
      max: 3,
      bool: "yes",
    })
    expect(codes(result)).toEqual([
      "TYPE_MISMATCH",
      "TYPE_MISMATCH",
      "OUT_OF_RANGE",
      "OUT_OF_RANGE",
      "TYPE_MISMATCH",
    ])
  })

  it("checks single and multiple selects", () => {
    const options = [
      { label: "One", value: "one" },
      { label: "Two", value: "two" },
    ]
    const fields: FieldDescriptor[] = [
      { name: "single", type: "select", label: "Single", required: false, options },
      {
        name: "multi",
        type: "select",
        label: "Multi",
        required: false,
        multiple: true,
        options,
      },
    ]
    const result = parse(fields, {
      single: "three",
      multi: ["one", 2, "three"],
    })
    expect(codes(result)).toEqual(["INVALID_OPTION", "TYPE_MISMATCH", "INVALID_OPTION"])
    expect(result.issues[1]?.path).toBe("multi[1]")

    const wrong = parse(fields, { single: 1, multi: "one" })
    expect(codes(wrong)).toEqual(["TYPE_MISMATCH", "TYPE_MISMATCH"])
  })

  it("validates datetime values with and without time", () => {
    const fields: FieldDescriptor[] = [
      { name: "date", type: "datetime", label: "Date", required: false, dateOnly: true },
      { name: "stamp", type: "datetime", label: "Stamp", required: false },
    ]
    const result = parse(fields, { date: "2026-2-3", stamp: "yesterday" })
    expect(codes(result)).toEqual(["INVALID_DATE", "INVALID_DATE"])

    const valid = parse(fields, {
      date: "2026-10-27",
      stamp: "2026-10-27T12:00:00.000Z",
    })
    expect(valid.issues).toEqual([])
  })

  it("validates image paths, media prefixes, and extensions", () => {
    const fields: FieldDescriptor[] = [
      { name: "image", type: "image", label: "Image", required: false },
      { name: "gif", type: "image", label: "GIF", required: false, extensions: ["gif"] },
    ]
    const result = parse(fields, {
      image: "/images/products/iris-no-7-1.jpg",
      gif: "/images/products/iris-no-7-1.jpg",
    })
    expect(codes(result)).toEqual(["INVALID_PATH"])

    const invalid = parse(fields, { image: "/elsewhere/x.jpg", gif: "/images/x.gif" })
    expect(codes(invalid)).toEqual(["INVALID_PATH"])

    const wrongType = parse(fields, { image: 3 })
    expect(codes(wrongType)).toEqual(["TYPE_MISMATCH"])
  })

  it("handles single and multiple relations", () => {
    const fields: FieldDescriptor[] = [
      {
        name: "single",
        type: "relation",
        label: "Single",
        required: false,
        collection: "products",
        displayFields: ["title"],
      },
      {
        name: "multi",
        type: "relation",
        label: "Multi",
        required: false,
        collection: "products",
        displayFields: ["title"],
        multiple: true,
      },
    ]
    const result = parse(fields, { single: "", multi: ["ok", 2, ""] })
    expect(codes(result)).toEqual(["TYPE_MISMATCH", "TYPE_MISMATCH", "TYPE_MISMATCH"])
    expect(result.issues[1]?.path).toBe("multi[1]")

    const wrong = parse(fields, { single: 3, multi: "ok" })
    expect(codes(wrong)).toEqual(["TYPE_MISMATCH", "TYPE_MISMATCH"])
  })

  it("checks list length and nested item shapes", () => {
    const fields: FieldDescriptor[] = [
      {
        name: "short",
        type: "list",
        label: "Short",
        required: false,
        itemMode: "scalar",
        min: 2,
        fields: [],
      },
      {
        name: "long",
        type: "list",
        label: "Long",
        required: false,
        itemMode: "scalar",
        max: 1,
        fields: [],
      },
      {
        name: "objects",
        type: "list",
        label: "Objects",
        required: false,
        itemMode: "object",
        fields: [{ name: "name", type: "string", label: "Name", required: true }],
      },
      {
        name: "scalars",
        type: "list",
        label: "Scalars",
        required: false,
        itemMode: "scalar",
        fields: [{ name: "value", type: "number", label: "Value", required: true }],
      },
      {
        name: "emptyScalars",
        type: "list",
        label: "Empty",
        required: false,
        itemMode: "scalar",
        fields: [],
      },
    ]
    const result = parse(fields, {
      short: ["one"],
      long: ["one", "two"],
      objects: [{ name: "ok" }, "bad", {}],
      scalars: [1, "two"],
      emptyScalars: ["kept"],
      wrong: "not-a-list",
    })
    expect(codes(result)).toEqual([
      "LIST_TOO_SHORT",
      "LIST_TOO_LONG",
      "TYPE_MISMATCH",
      "MISSING_REQUIRED",
      "TYPE_MISMATCH",
      "UNMODELED_KEY",
    ])

    const wrongList = parse(fields, { short: "nope" })
    expect(codes(wrongList)).toEqual(["TYPE_MISMATCH"])
  })

  it("parses nested objects and reports non-object values", () => {
    const fields: FieldDescriptor[] = [
      {
        name: "contact",
        type: "object",
        label: "Contact",
        required: false,
        fields: [
          {
            name: "email",
            type: "string",
            label: "Email",
            required: true,
            format: "email",
          },
        ],
      },
    ]
    const result = parse(fields, { contact: { email: "bad" } })
    expect(codes(result)).toEqual(["PATTERN_MISMATCH"])
    const wrong = parse(fields, { contact: [] })
    expect(codes(wrong)).toEqual(["TYPE_MISMATCH"])
  })

  it("preserves hidden values and flags unknown field types without throwing", () => {
    const fields = [
      { name: "hidden", type: "hidden", label: "Hidden", required: false, defaultValue: "x" },
      { name: "mystery", type: "mystery", label: "Mystery", required: false },
    ] as unknown as FieldDescriptor[]
    const result = parse(fields, { mystery: { kept: true } })
    expect(result.value.hidden).toBeUndefined()
    expect(result.value.mystery).toEqual({ kept: true })
    expect(codes(result)).toEqual(["UNKNOWN_FIELD_TYPE"])
  })

  it("preserves unmodeled keys with escaped JSON Pointers and skips dangerous keys", () => {
    const fields: FieldDescriptor[] = []
    const raw = JSON.parse(
      '{"a/b":{"c~d":1},"__proto__":{"polluted":true},"constructor":1,"prototype":2}',
    ) as Record<string, unknown>
    const result = parse(fields, raw)
    expect(result.untouched).toEqual({ "/a~1b": { "c~d": 1 } })
    expect(codes(result)).toEqual(["UNMODELED_KEY"])
  })
})

import { describe, expect, it } from "vitest"
import { z } from "zod"
import { divider } from "../divider"
import {
  boolean,
  datetime,
  hidden,
  image,
  list,
  number,
  object,
  relation,
  select,
  slug,
  string,
} from "../factories"
import { getFieldMeta } from "../meta"

describe("field factories carry CMS metadata", () => {
  it("attaches metadata and required semantics", () => {
    const title = string({ label: "Title", minLength: 1 })
    expect(getFieldMeta(title)).toMatchObject({
      type: "string",
      label: "Title",
      required: true,
      minLength: 1,
    })

    const optional = string({ label: "Optional", required: false })
    expect(getFieldMeta(optional)?.required).toBe(false)
    expect(optional.safeParse(undefined).success).toBe(true)
  })

  it("validates values through the underlying zod schema", () => {
    expect(string({ label: "Email", format: "email" }).safeParse("a@b.co").success).toBe(true)
    expect(string({ label: "Email", format: "email" }).safeParse("nope").success).toBe(false)
    expect(number({ label: "Price", int: true, min: 0 }).safeParse(1.5).success).toBe(false)
    expect(boolean({ label: "On" }).safeParse(true).success).toBe(true)
    expect(datetime({ label: "When" }).safeParse("2026-10-27T10:00:00Z").success).toBe(true)
    expect(datetime({ label: "Day", dateOnly: true }).safeParse("2026-10-27").success).toBe(true)
    expect(image({ label: "Photo" }).safeParse("/images/products/iris-no-7-1.jpg").success).toBe(
      true,
    )
    expect(image({ label: "Photo" }).safeParse("javascript:alert(1)").success).toBe(false)
  })

  it("normalizes select options and rejects duplicates/defaults outside options", () => {
    const theme = select({
      label: "Theme",
      options: [
        { label: "Light Natural", value: "natural" },
        { label: "Ode to Iris", value: "iris" },
      ],
      defaultValue: "natural",
    })
    expect(getFieldMeta(theme)).toMatchObject({
      type: "select",
      options: [
        { label: "Light Natural", value: "natural" },
        { label: "Ode to Iris", value: "iris" },
      ],
      defaultValue: "natural",
    })
    expect(() => select({ label: "Bad", options: ["a", "a"] })).toThrow(/duplicate/)
    expect(() => select({ label: "Bad", options: ["a"], defaultValue: "b" })).toThrow(
      /defaultValue/,
    )
    expect(() => select({ label: "Bad", options: [] })).toThrow(/at least one/)
  })

  it("supports object lists, scalar lists, objects and relations", () => {
    const specs = list({
      label: "Specs",
      fields: {
        label: string({ label: "Label" }),
        value: string({ label: "Value" }),
      },
      summary: "{{fields.label}}: {{fields.value}}",
    })
    expect(getFieldMeta(specs)).toMatchObject({
      type: "list",
      itemMode: "object",
      min: undefined,
      summary: "{{fields.label}}: {{fields.value}}",
    })

    const lines = list({
      label: "Location lines",
      field: { name: "line", schema: string({ label: "Line" }) },
    })
    expect(getFieldMeta(lines)).toMatchObject({ type: "list", itemMode: "scalar" })

    const contact = object({
      label: "Contact",
      fields: {
        email: string({ label: "Email", format: "email" }),
        lines,
      },
    })
    expect(getFieldMeta(contact)).toMatchObject({ type: "object" })

    const target = relation({
      label: "Products",
      collection: "products",
      multiple: true,
      valueField: "{{slug}}",
      displayFields: ["title"],
    })
    expect(getFieldMeta(target)).toMatchObject({
      type: "relation",
      collection: "products",
      multiple: true,
      valueField: "slug",
    })
  })

  it("keeps hidden defaults as metadata only", () => {
    const field = hidden({ label: "Material filter", defaultValue: "Ceramics" })
    expect(getFieldMeta(field)?.defaultValue).toBe("Ceramics")
    expect(field.safeParse(undefined).success).toBe(true)
    expect(field.safeParse({ anything: true }).success).toBe(true)
  })

  it("slug is virtual and optional", () => {
    const field = slug({ label: "Slug" })
    expect(getFieldMeta(field)).toMatchObject({ type: "slug", required: false })
    expect(field.safeParse(undefined).success).toBe(true)
  })

  it("divider is a decoration declaration", () => {
    expect(divider({ before: "title", label: "Basics" })).toEqual({
      before: "title",
      label: "Basics",
    })
    expect(() => divider({ before: "" })).toThrow(/before/)
  })

  it("rejects invalid child metadata", () => {
    expect(() => list({ label: "Bad", fields: { raw: z.string() } })).toThrow(/metadata|fields/)
    expect(() => object({ label: "Bad", fields: {} })).toThrow(/at least one/)
  })
})

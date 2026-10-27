import type { FieldDescriptor } from "../types"

export const media = { folder: "public/images", publicFolder: "/images" } as const

export const productFields: readonly FieldDescriptor[] = [
  { name: "title", type: "string", label: "Product name", required: true },
  { name: "price", type: "number", label: "Price", required: true, int: true, min: 0 },
  {
    name: "category",
    type: "select",
    label: "Category",
    required: true,
    options: [
      { label: "Table Lamps", value: "Table Lamps" },
      { label: "Pendant Lights", value: "Pendant Lights" },
      { label: "Custom", value: "Custom" },
    ],
  },
  {
    name: "images",
    type: "list",
    label: "Photos",
    required: true,
    itemMode: "object",
    min: 1,
    max: 3,
    fields: [
      { name: "image", type: "image", label: "Photo", required: true },
      { name: "alt", type: "string", label: "Alt", required: true },
      {
        name: "objectPosition",
        type: "hidden",
        label: "Crop focus",
        required: false,
        defaultValue: "center",
      },
    ],
  },
  {
    name: "people",
    type: "list",
    label: "Founders",
    required: true,
    itemMode: "object",
    min: 1,
    fields: [
      { name: "name", type: "string", label: "Name", required: true },
      { name: "bio", type: "text", label: "Bio", required: true },
    ],
  },
  {
    name: "locationLines",
    type: "list",
    label: "Location lines",
    required: true,
    itemMode: "scalar",
    fields: [{ name: "line", type: "string", label: "Line", required: true }],
  },
  {
    name: "contact",
    type: "object",
    label: "Contact",
    required: true,
    fields: [
      {
        name: "email",
        type: "string",
        label: "Email",
        required: true,
        format: "email",
      },
      { name: "phone", type: "string", label: "Phone", required: true },
    ],
  },
  {
    name: "featured",
    type: "relation",
    label: "Featured",
    required: false,
    collection: "products",
    displayFields: ["title"],
  },
  {
    name: "materialFilter",
    type: "hidden",
    label: "Material family",
    required: false,
    defaultValue: "Ceramics",
  },
  { name: "slug", type: "slug", label: "Slug", required: false },
]

export function cleanRaw(): Record<string, unknown> {
  return {
    title: "Iris No. 7",
    price: 1650,
    category: "Table Lamps",
    images: [
      {
        image: "/images/products/iris-no-7-1.jpg",
        alt: "Iris No. 7 sculptural lamp",
        objectPosition: "center",
      },
    ],
    people: [{ name: "Ing", bio: "Hat maker" }],
    locationLines: ["Atelier visits by appointment", "The Netherlands"],
    contact: { email: "atelier@ingandyve.nl", phone: "+31 6 12 34 56 78" },
    featured: "iris-no-3",
  }
}

export function driftRaw(): Record<string, unknown> {
  return {
    ...cleanRaw(),
    category: "Floor Lamps",
    price: 1650.5,
    people: [],
    contact: { email: "not-an-email", phone: "+31 6 12 34 56 78" },
    featured: "missing-product",
    extraDeveloperKey: { kept: true },
    images: [
      {
        image: "/images/products/iris-no-7-1.jpg",
        alt: "Iris No. 7 sculptural lamp",
        devCaption: "keep me",
      },
    ],
  }
}

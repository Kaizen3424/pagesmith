/**
 * Field-type registry vocabulary — the pure half of the dual-registry design
 * (ADR-0009 §1, master-plan §4.2). P0: names only; `defineFieldType` and the
 * parse/serialize/validate contracts land in P1.1/P1.2 (ADR-0003).
 */
export type FieldTypeName =
  | "string"
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "datetime"
  | "list"
  | "object"
  | "image"
  | "relation"
  | "hidden"
  | "slug";

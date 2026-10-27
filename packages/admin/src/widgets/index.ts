/**
 * Admin widget registry — the admin half of the dual-registry design
 * (ADR-0009 §1: core fields ↔ admin widgets joined by name). P0 placeholder;
 * `defineWidget` + bindings land P1.9+, the reference-swatch exemplar in P3.6.
 */

export interface WidgetBinding {
  /** Name of the core field type this widget renders (ADR-0009 join-by-name law). */
  readonly fieldTypeName: string;
}

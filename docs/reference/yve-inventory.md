# yve gallery — CMS field inventory & integration reference (frozen at planning)

> Source: extracted verbatim from `yve_gallery_decap/public/admin/config.yml` (497 lines) + `src/lib/content.ts` (400 lines) by agent exploration on 2026-10-27. This file is the **parity golden target** (INV-C01) — update only via PR with owner sign-off. Legend: ✔ required (Decap default), ✗ optional, HID `widget: hidden`.

## Global config

```yaml
backend: { name: github, repo: Kaizen3424/iye_gallery_demo, branch: main, auth_methods: [token] }
site_url: https://iye-gallery-demo.scantest.workers.dev
media_folder: public/images
public_folder: /images
# NOT present: locale, i18n, publish_mode (direct commit to main), media_library block, editor previews, custom widgets
```

Admin entry: `public/admin/index.html` — pinned Sveltia CDN (`@sveltia/cms@0.251.0`); title "ING & YVE · Content studio"; to be replaced at P6 by this admin's dist (Sveltia preserved at `/admin-legacy/`).

## products — folder `src/content/products`, JSON, create/delete, identifier `title`

Options: `summary: "{{title}} · € {{price}}"`, `preview_path: /product/{{slug}}`, `sortable_fields: [title, price]`, `thumbnail: images.0.image`, `media_folder: /public/images/products`, `public_folder: /images/products`, `view_groups` on `category`: `table-lamps/"Table Lamps"`, `pendant-lights/"Pendant Lights"`, `custom/"Custom"`.

```yaml
title:        string ✔            → z.string().min(1)
price:        number ✔ (int, min 0)      → z.number().nonnegative()      # DRIFT: CMS int, zod no .int()
pricePrefix:  string ✗                   → z.string().default("")
displayName:  string ✔                   → z.string().min(1)
material:     string ✔                   → z.string().min(1)
category:     select ✔ options: [Table Lamps, Pendant Lights, Custom]   # DRIFT: select vs z.string().min(1)
description:  text ✔                     → z.string()
images:       list ✔ min 1 max 3, summary "{{fields.alt}}"
  image:      image ✔                    → imagePath (regex below)
  alt:        string ✔                   → z.string()
  objectPosition: HID default "center"    → objectPosition enum
            → z.array({image, alt, objectPosition}).min(1).max(3)
options:      list ✔ min 1, nested ("choice tabs" — stock widgets only)
  name:       string ✔
  values:     list ✔ min 1, summary "{{fields.label}}"
    label:    string ✔
    swatch:   select, default "accent", label→value: Gold→accent, Neutral→muted, Deep blue→secondary
            → z.array({name, values: z.array({label, swatch: z.enum([accent,muted,secondary]).default(accent)})}).min(1)
specs:        list {label ✔, value ✔}, summary "{{fields.label}}: {{fields.value}}"
accordions:   list {title ✔, body ✔ text}, summary "{{fields.title}}"
kicker:       HID default ""             → z.string()
materialFilter: HID default "Ceramics"                                   # DRIFT: default on create only
seo:          HID                        → seo block
```

## collections — folder `src/content/collections`, JSON (2 files: light-natural, ode-to-iris)

Options: `summary: "{{number}} — {{title}}"`, `preview_path: /collections/{{slug}}`, `sortable_fields: [number, title]`, `thumbnail: image`, media folders `.../collections`.

```yaml
number:* title*: subtitle*: string ✔; theme* select {Light Natural→natural, Ode to Iris→iris} → z.enum
image:* imageAlt*: intro* (text): ✔; sectionTitle*/sectionBody*(text)/ctaLabel*: ✔
featuredProducts: relation ✔ multi, target products, value_field {{slug}}, display [title], search [title, material]
heroKicker, mood, paletteLabels, sectionTitleAccent: HID default ""
heroObjectPosition, indexObjectPosition: HID default "center"
seo: HID
# build injects slug from filename; collections sorted by number.localeCompare —
# SHARED-COMPARATOR RULE: admin sort must import the same comparator module as the build (INV-C01)
```

## pages — group `pages` (icon menu_book), media `.../site`

home.json: titleLine1*, titleLine2* (italic line), intro* text, ctaLabel*, image*, imageAlt*, studyLabel*; studyProduct: relation ✔ single (products, value {{slug}}, display [title], search [title]); kicker HID; seo HID.
collections-page.json: titleLine1*, titleLine2*, intro*; kicker/seo HID.
craft.json: titleLine1/2, image, imageAlt, statValue, statTitle, statBody (text); features list **exactly 4** {title*, text* text, icon HID enum [map-pin|recycle|circle-dot|leaf] no default}; ceramicTitleLine1/2, ceramicBody (text), ceramicImage*, ceramicImageAlt*; kicker, ceramicKicker, seo HID.
about.json: titleLine1/2, image, imageAlt, quote (text); people list — **CMS has NO min** while zod enforces `.min(1)` (DRIFT #2) {name*, bio* text}; enquiryTitleLine1/2, enquiryBody (text); form HID (granular zod: nameLabel, namePlaceholder, emailLabel, emailPlaceholder, roleLabel, roles array min1, ideaLabel, ideaPlaceholder, submitLabel, sentLabel); kicker, quoteKicker, enquiryKicker, seo HID.
bespoke.json ("Maatwerk · Bespoke studio"): titleLine1/2, intro, image, imageAlt, basePrice* (int min 0); diameters list min1 {value* (num min 1 — not int), surcharge* (int min 0)}; finishes list min1 {label*, surcharge*}; HID granular: kicker; steps (shape{number,title,shapeLabel,diameterLabel}, image{number,title,uploadTitle,uploadHint,verifiedTitle,verifiedHint}, finish{number,title,finishLabel,pipingLabel}, composition{number,title,formLabel,finishSummaryLabel,priceLabel,note,addLabel,addedLabel} — all plain strings); shapes array min1; piping array min1; backLabel, continueLabel, previewLabel; seo.

## site — settings group (icon tune), file `src/content/site.json`, entry "Contact details" (icon contact_mail)

```yaml
contact object ✔:
  email:        string ✔ (type: email — input hint only)   # DRIFT #4: zod plain z.string()
  phone:        string ✔
  locationLines: list ✔ single-field form {name: line, widget: string}
brand/nav/footer: HID (full granular zod incl. nav route enum [/,/bespoke,/collections,/our-craft,/about],
                  footer.discover href z.string().url(), homeStrip z.tuple([str,str,str]))
# no per-collection media folder → inherits global public/images
```

## Shared zod blocks (src/lib/content.ts)

```ts
imagePath      = z.string().regex(/^\/images\/[\w./-]+\.(?:jpe?g|png|webp|avif|svg)$/i)
objectPosition = z.enum(["center","left center","right center","top center","bottom center"])
seo            = z.object({ title: z.string().optional(), description: z.string().optional() }).optional()
```

## The six pinned drift cases (CI fixture INV-C02)

1. `category`: CMS select (3 options) vs zod `z.string()`.
2. `people`: CMS list no-min vs zod `.min(1)`.
3. `price`/`basePrice`/diameter values/surcharges: CMS `int` vs zod no `.int()`.
4. `contact.email`: CMS email hint vs plain `z.string()`.
5. Relations persist slug strings; integrity enforced by module-load throw at build (lines 374–384), not zod.
6. Hidden-field defaults applied on new entries only (e.g. `materialFilter:"Ceramics"`) — not on edit-open.

Plus conventions: slug = filename-derived virtual (never stored); money = `Intl.NumberFormat("nl-NL", {currency:"EUR", maximumFractionDigits: 0})` → **€ 1.475** format (shared money helper); files = 2-space indent, author key order, LF, trailing newline, raw Unicode (Ø, –, ·); only edited files may re-serialize (INV-S01 golden set); entry JSON shows inline objects-in-arrays (`{ "label": …, "value": … }`).

Statements of fit: ~14 fields/products entry, ~18/collections, leaner page docs — the v1 registry set (§ master-plan §6) covers every widget above with zero stock-type gaps; `divider` stays a decoration primitive; `swatch` ships as the reference custom widget (ADR-0009).

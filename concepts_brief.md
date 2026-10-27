# Git-Based Headless & Themed CMS (My_CMS)

* **Author:** Project Brainstorm
* **Date:** 2026-10-27

## Overview

A standalone, git-backed Content Management System monorepo (`packages/core` and `packages/admin`) designed to provide a customizable, themeable React-based admin interface over file-based content (JSON documents in `src/content/` and media in `public/images/`). The primary differentiator is a schema-driven architecture using TypeScript and Zod to enforce content contracts both at compile time (for host applications) and runtime (inside admin form fields and validation pipelines).

The system operates without a dedicated database, persisting all state directly to GitHub repositories using authenticated REST Git Data APIs, while maintaining local draft resilience via IndexedDB.

---

## Analysis & Architectural Stress-Testing

### 1. Monorepo Architecture & Packaging Strategy

* **The Agnostic vs. React Dilemma:**
  Positioning between Sveltia (zero-build, fixed UI, CDN script) and Keystatic/Tina (tightly coupled to Next.js/Astro) requires resolving how `packages/admin` is distributed.
  * If `packages/admin` is shipped purely as React components (`@my-cms/admin`), it locks the consumer into a React-compatible build pipeline (Vite, Next.js, TanStack Start). Non-React static sites cannot consume it without setting up an isolated React SPA bundle.
  * *Recommended Architecture:*
    * `packages/core`: Zero-DOM, platform-agnostic TypeScript library handling GitHub Git Data APIs, Zod schema compilation, IndexedDB caching, and serialization.
    * `packages/admin`: Standalone React UI library exporting both composable components/hooks AND a turnkey pre-bundled SPA runner (mountable via Vite or exported as a standalone HTML+JS output for `public/admin/index.html`).

* **Monorepo Tooling:**
  * Package manager: `pnpm` with workspaces.
  * Build system: `tsup` or `vite` library mode for clean ESM/CJS exports and `.d.ts` generation.

---

### 2. Schema Engine & The "Zod-First" Contract

* **The Zod Metadata Deficit:**
  Standard Zod schemas (`z.string().min(3)`) validate types and primitives, but contain no UI field metadata (labels, hints, widget types, media upload rules, relation lookups, or hidden flags).
  * Attempting to rely solely on `z.string().describe()` produces weakly typed, stringified metadata that breaks IDE auto-completion and type safety.
  * *Required API Pattern:* A schema factory where Zod remains the underlying validator, but field definitions wrap schemas with explicit CMS metadata.
    * Example:
      ```ts
      export const productSchema = defineCollection({
        name: 'products',
        path: 'src/content/products',
        schema: z.object({
          title: fields.string({ label: 'Product Name', hint: '...' }),
          price: fields.number({ label: 'Price (€)', min: 0, integer: true }),
          category: fields.select({ label: 'Category', options: ['Table Lamps', 'Pendant Lights'] }),
          images: fields.list(
            fields.object({
              image: fields.image({ label: 'Photo', folder: 'public/images/products' }),
              alt: fields.string({ label: 'Accessibility description' }),
              objectPosition: fields.hidden({ default: 'center' }),
            }),
            { min: 1, max: 3 }
          ),
          featuredIn: fields.relation({
            label: 'Collection',
            collection: 'collections',
            valueField: 'slug',
            displayField: 'title',
          }),
        }),
      });
      ```
* **Preservation of Dev-Owned / Hidden Fields:**
  In existing deployments (such as `yve_gallery_decap`), files contain structural fields (e.g., `kicker`, `seo`, `mood`, `materialFilter`) marked `widget: hidden` or not defined in the admin UI.
  * If Zod runs with standard `.strip()` or strict parsing on save, undeclared fields are permanently deleted from git.
  * The engine must use `.passthrough()` or explicit schema-level preservation to prevent data loss on existing files.

* **Cross-Document Referential Integrity:**
  Relations (e.g. `featuredProducts` referencing `products`) cannot be validated purely synchronously in Zod without loading all collection records into memory. The core validation layer must support asynchronous context validation.

---

### 3. GitHub Storage Layer & Race Conditions

* **Commit Atomicity:**
  Using the GitHub Contents API (`PUT /repos/{owner}/{repo}/contents/{path}`) creates one commit per file, cluttering history and risking partial failures if an entry has 3 images plus 1 JSON file.
  * *Required Mechanism:* The GitHub Low-Level Git Data Trees API:
    1. Upload binary media files as Git Blobs (`POST /repos/{owner}/{repo}/git/blobs`).
    2. Construct a single Tree object pointing to all modified/added blobs and JSON files (`POST /repos/{owner}/{repo}/git/trees` with `base_tree`).
    3. Create a single Git Commit object (`POST /repos/{owner}/{repo}/git/commits`).
    4. Fast-forward the target branch ref (`PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}`).
    * This makes publishing completely atomic: either all files land in one commit SHA, or none do. No squashing needed.

* **Race Conditions & Non-Fast-Forward Pushes:**
  * If a concurrent commit lands on `main` between tree construction and ref update, the `PATCH /refs/heads/{branch}` call rejects with `422 Conflict`.
  * *Failure Mode to Avoid:* Blind reload destroys unsaved user edits.
  * *Required Mitigation:* IndexedDB retains the complete dirty payload. The UI flags the remote collision, fetches the updated base tree, and allows the user to re-attempt the atomic commit on the new tip or inspect field-level conflicts.

* **Rate Limits & Blob Fetching:**
  * GitHub Personal Access Tokens and OAuth tokens provide 5,000 requests/hour.
  * Iterating through 200 documents via individual file endpoints exhausts rate limits quickly.
  * The core layer must fetch the collection directory tree recursively in a single call (`GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`) and cache tree SHAs in IndexedDB.

---

### 4. Media Handling & Local Resilience

* **Client-Side Image Manipulation:**
  * Browser canvas manipulation can strip color profiles (sRGB/P3) and EXIF data.
  * Resizing must happen via `OffscreenCanvas` or Web Worker to keep the UI thread responsive.
  * Distinguish between destructive resizing (file bytes scaled down before git upload) and non-destructive framing (saving focal coordinates like `objectPosition: "center"`).

* **Private vs. Public Repo Assets:**
  * Public repos allow direct raw URL previews. Private repos require authenticated Octokit raw blob reads and `URL.createObjectURL(blob)` management to prevent memory leaks in long sessions.

* **Autosave & Draft Lifecycle:**
  * Form inputs debounce writes to IndexedDB (key: `${repo}/${collection}/${slug}`).
  * Draft state must be distinguishable from committed git state (e.g., `clean`, `dirty`, `syncing`, `conflict`).

---

## Goals vs. Non-Goals

### In-Scope Goals (v1 Boundary)
* **Monorepo Architecture:** `packages/core` (pure TS logic) + `packages/admin` (React UI).
* **Zod-Backed Form Engine:** Typesafe schema definitions generating both runtime form inputs and compile-time TypeScript types.
* **12 Essential Widgets:** `string`, `text`, `number`, `select`, `list` (nested object support), `object`, `image` (with alt and focal/crop controls), `relation` (collection lookup), `hidden` (passthrough preservation), `divider`, `boolean`, `markdown/richtext` basic.
* **Atomic GitHub Backend:** Git Data API (Blobs, Trees, Commits, Refs) delivering single-commit multi-file transactions.
* **Authentication:** GitHub Personal Access Token (PAT) entry + OAuth worker redirect flow.
* **Crash Resilience:** IndexedDB draft persistence per collection/record with dirty tracking.
* **Conflict Guard:** Non-destructive push collision alerts that retain uncommitted local data.

### Out-of-Scope Non-Goals (Deferred to v2+)
* Branch-based editorial workflow (PR creation, review stages, draft branches). All v1 writes land on the target production branch.
* Automated migration parser for Decap `config.yml`.
* GitLab / Bitbucket / Gitea backend providers.
* Multi-locale / i18n content branching.
* Visual live-preview iframe synchronization with host frameworks.
* Real-time collaborative multi-user editing.

---

## Key Decisions & Staging for Next Steps

1. **Packaging Form Factor:** Resolve whether `packages/admin` is exclusively an embeddable component set or also builds a drop-in static SPA bundle.
2. **Schema DSL Definition:** Finalize the TypeScript syntax bridging Zod schemas with widget UI metadata.
3. **Commit Pipeline:** Validate the atomic Git Data API contract over Octokit.

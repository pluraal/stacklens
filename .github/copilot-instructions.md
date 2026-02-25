# StackLens – Copilot Instructions

## Project Overview

StackLens is a **semantic classification layer for software repositories**. It models a repository's technology stack as a typed, hierarchical ontology declared in a **Stackfile** (`.stack`, YAML). From this declaration, StackLens can derive stack-aware projections (e.g. context slicing, `.gitignore` suggestions).

The project is early-stage. `src/` is mostly scaffolding; the authoritative design lives in `specs/`.

## Commands

```bash
npm run typecheck   # type-check without emitting
npm run lint        # ESLint (typescript-eslint)
npm run lint:md     # Markdown linting (markdownlint-cli2)
npm run lint:md-links # Markdown link validation
npm run build       # tsc → dist/
npm run test        # node --test dist/**/*.test.js  (must build first)
npm run ci          # Full validation: typecheck + lint + lint:md + lint:md-links + build
```

**After editing any Markdown file**, always run:

```bash
npm run lint:md && npm run lint:md-links
```

**Run a single test file:**

```bash
npm run build && node --test dist/path/to/file.test.js
```

Tests use Node.js's built-in `node:test` runner — no external test framework.

## Architecture

```
src/          TypeScript source (compiles to dist/)
specs/        Domain specifications (authoritative design docs)
  product.md       Vision and problem statement
  tech.md          Technical invariants / design principles
  stackfile-v0.md  Stackfile format specification v0
dist/         Build output (gitignored)
.specify/     SpecKit governance and templates
  memory/
    constitution.md  Project constitution and technical principles
```

`src/index.ts` is the public API entry point; all public exports go through it.

**Governance**: All design and implementation decisions must align with the constitution at [../.specify/memory/constitution.md](../.specify/memory/constitution.md). The 10 core principles are non-negotiable technical invariants derived from `specs/tech.md`.

### Domain Model (from specs)

The core domain is defined in `specs/stackfile-v0.md` and `specs/tech.md`. Implementations must conform to these specs.

**Stackfile** (`.stack` YAML):

```yaml
version: "0.1"
imports: # optional; external versioned tech definitions
  - source: string
    version: string
technologies: # required
  - id: string # unique within resolved set
    parent: string # optional; omit for roots
    detect:
      include: # ≥1 POSIX-style glob, evaluated from repo root
        - "**/*.ts"
    tags: [] # optional flat metadata; NOT part of hierarchy
    description: string
```

**Resolution algorithm** (must be deterministic):

1. Validate hierarchy (no cycles, all parents exist, no duplicate ids).
2. For each file, evaluate all `include` globs → collect matching technologies.
3. Select the **deepest** match as primary; ancestors are implicitly included.
4. Same-depth conflict → validation error.

**Key invariants** (from `specs/tech.md`):

- Single-inheritance tree; hierarchy must be acyclic.
- Tags are flat annotations — no detection rules, no hierarchy participation.
- Local technology definitions override imported ones with the same `id`.
- Resolution must be deterministic and offline-capable.
- StackLens must not execute code, mutate files, or control runtime behavior.

## Key Conventions

- **Pure ESM only** — no `require`, no `module.exports`, no CommonJS helpers.
- **`noUncheckedIndexedAccess` is enabled** — always guard array/object index access.
- **No `any`** — ESLint enforces this as an error; use `unknown` + narrowing.
- **Unused vars** are errors; prefix intentionally unused parameters with `_`.
- Tests are colocated with source as `*.test.ts` files.
- Filenames use **kebab-case** (e.g., `stackfile-parser.ts`).
- The `specs/` directory is not compiled — it is specification, not code. Implementations must stay in sync with it.
- **Markdown validation is mandatory** — after editing any `.md` file, run `npm run lint:md && npm run lint:md-links` to verify syntax and links. All markdown files must pass validation before committing.

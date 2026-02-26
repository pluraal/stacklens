# Quickstart: Minimal CLI Development

**Feature Branch**: `001-minimal-cli`

---

## Prerequisites

- Node.js ≥ 20.x
- npm ≥ 10.x
- TypeScript is a devDependency — no global install required

---

## Setup

```bash
# Clone and install
git clone <repo>
cd stacklens
npm install
```

---

## Development Workflow

```bash
# Type-check without emitting (fast feedback)
npm run typecheck

# Lint TypeScript source
npm run lint

# Compile to dist/
npm run build

# Run all tests (must build first)
npm run test

# Full CI pipeline (typecheck + lint + markdown lint + build)
npm run ci
```

---

## Running the CLI Locally

After building, invoke the CLI via the compiled entry point:

```bash
# Direct node invocation (no install required)
node dist/cli/main.js --help
node dist/cli/main.js status

# Or link for global invocation
npm link
stacklens --help
stacklens status
```

---

## Usage: `stacklens status`

Run from the root of a repository that contains a `.stack` file:

```bash
# In a properly configured project
cd /path/to/my-project
stacklens status
```

**Output — all files covered (exit 0)**:

```
✓ Stackfile valid. All files are covered.
```

**Output — uncovered files found (exit 1)**:

```
src/utils/helpers.ts
src/utils/math.ts
config/database.yml

3 uncovered file(s) found.
```

**Output — invalid Stackfile (exit 1)**:

```
Stackfile validation failed:
  [MISSING_VERSION] "version" field is required.
  [UNKNOWN_PARENT] technology "typescript-test" references unknown parent "typescript".
```

**Output — Stackfile not found (exit 1)**:

```
Stackfile not found at: /path/to/my-project/.stack
```

---

## Example `.stack` File

```yaml
version: "0.1"

technologies:
  - id: typescript
    detect:
      include:
        - "**/*.ts"
        - "**/*.tsx"

  - id: typescript-test
    parent: typescript
    tags:
      - test
    detect:
      include:
        - "**/*.test.ts"
        - "**/*.spec.ts"

  - id: javascript
    detect:
      include:
        - "**/*.js"
        - "**/*.mjs"

  - id: json-config
    detect:
      include:
        - "**/*.json"

  - id: yaml-config
    detect:
      include:
        - "**/*.yml"
        - "**/*.yaml"

  - id: markdown
    detect:
      include:
        - "**/*.md"
```

---

## Project Structure (after this feature)

```
src/
├── cli/
│   ├── main.ts                          # #!/usr/bin/env node entry point
│   ├── program.ts                       # Commander program factory
│   └── commands/
│       └── status/
│           ├── status-command.ts        # register(program) + action handler
│           └── status-command.test.ts
├── stackfile/
│   ├── types.ts                         # Shared TypeScript interfaces
│   ├── stackfile-loader.ts              # File I/O: locate + read .stack
│   ├── stackfile-loader.test.ts
│   ├── stackfile-parser.ts              # YAML parsing (wraps 'yaml' library)
│   ├── stackfile-parser.test.ts
│   ├── stackfile-validator.ts           # Structural + semantic validation
│   └── stackfile-validator.test.ts
├── coverage/
│   ├── types.ts                         # CoverageResult, RelativeFilePath
│   ├── file-scanner.ts                  # Enumerate files (globby + gitignore)
│   ├── file-scanner.test.ts
│   ├── coverage-analyzer.ts             # Apply globs, return uncovered files
│   └── coverage-analyzer.test.ts
└── index.ts                             # Public API re-exports (existing)

specs/
└── 001-minimal-cli/
    ├── spec.md
    ├── plan.md
    ├── research.md
    ├── data-model.md
    ├── quickstart.md
    ├── contracts/
    │   ├── cli-contract.md
    │   └── output-format.md
    └── fixtures/
        ├── valid-all-covered/
        │   └── .stack
        ├── valid-with-uncovered/
        │   ├── .stack
        │   └── uncovered.xyz
        ├── empty-technologies/
        │   └── .stack
        ├── invalid-missing-version/
        │   └── .stack
        ├── invalid-unknown-key/
        │   └── .stack
        └── invalid-cycle/
            └── .stack
```

---

## Adding a New Command (Future)

1. Create `src/cli/commands/<name>/<name>-command.ts` and export `register(program: Command): void`.
2. In `src/cli/main.ts`, add one import and one `register(program)` call.
3. No other files change.

---

## Testing Notes

Tests use Node.js built-in `node:test` (no external framework). Build before testing:

```bash
npm run build && npm run test
```

For the `status` command integration tests, fixture `.stack` files live under `specs/001-minimal-cli/fixtures/`. Tests resolve fixture paths relative to the compiled test file location so they work from the `dist/` directory.

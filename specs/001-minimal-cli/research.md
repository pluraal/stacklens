# Research: Minimal CLI

**Phase**: 0 — Outline & Research  
**Feature Branch**: `001-minimal-cli`  
**Date**: 2025-07-14

---

## 1. CLI Framework

**Decision**: Commander v14 (current stable: `14.0.3`)

**Rationale**:
- Ships as dual CJS/ESM package; ESM named export `import { Command } from 'commander'` works with `"type": "module"` projects compiled via tsc.
- `parseAsync()` supports fully async action handlers (required for file I/O in the `status` command).
- Built-in help generation at top-level and per-subcommand satisfies FR-010.
- `program.addHelpCommand(false)` and `program.helpOption(...)` give fine-grained control over default behaviour.
- Unknown subcommands produce a non-zero exit by default, satisfying User Story 4.
- Well-documented API with no breaking changes expected in the near term.

**Alternatives considered**:
- **yargs**: Larger API surface, CommonJS roots (ESM support is secondary), more configuration overhead for a minimal CLI.
- **meow**: Minimal but not subcommand-oriented; extending to multiple commands later would require manual dispatch.
- **oclif**: Framework-level complexity mismatched to a single-command MVP.

**Extension pattern (FR-012)**: Each command module exports a `register(program: Command): void` function. `main.ts` imports and calls each `register` call in sequence. Adding a new command requires creating one new module and adding one import + one `register(program)` call in `main.ts` — no changes to existing command modules.

---

## 2. YAML Parsing

**Decision**: `yaml` v2 (eemeli/yaml, current stable: `2.8.2`)

**Rationale**:
- Published as a pure-ESM package (`"type": "module"`); imports integrate seamlessly with tsc output.
- Ships its own TypeScript declarations — no separate `@types/*` package needed.
- YAML 1.2 compliant; handles all valid Stackfile documents.
- `parse()` returns `unknown`, which aligns with the project rule of `no any` + narrowing via validator.
- Actively maintained (as of 2025).

**Alternatives considered**:
- **js-yaml**: Hybrid CJS/ESM distribution; requires `import jsYaml from 'js-yaml'` default import style, which conflicts with `"esModuleInterop": false` in tsconfig. Also requires `@types/js-yaml`.
- **Custom YAML subset parser**: Unnecessary complexity; YAML parsing is not a differentiating concern for StackLens.

**Usage pattern**:
```typescript
import { parse } from 'yaml';
const raw: unknown = parse(fileContents);
```

---

## 3. Gitignore-aware File Scanning

**Decision**: `globby` v16 (current stable: `16.1.1`)

**Rationale**:
- Pure-ESM package (`"type": "module"`), no CJS shim required.
- Native `.gitignore` support via `{ gitignore: true }` option — walks up from `cwd` and respects all `.gitignore` files in the repository tree, matching Git's actual behaviour.
- Wraps `fast-glob` internally; tested and performant at 10 000+ files.
- `cwd` option makes it trivial to scan relative to an arbitrary repository root, not just `process.cwd()` (important for testability).
- Ships full TypeScript declarations.

**Alternatives considered**:
- **`glob` v11** (already a devDependency): Does not natively respect `.gitignore`. The readme explicitly recommends `globby` for gitignore support.
- **`fast-glob` + `ignore`**: `ignore` package (kahmali/ignore) has not been updated since 2020; manual wiring adds complexity that `globby` already solves.
- **`git ls-files` subprocess**: Requires `git` on `$PATH`, a git repository initialised, and a live process — all three violate SC-006 (tests must run without filesystem mount or network access) and II. Deterministic Resolution.

**Usage pattern**:
```typescript
import { globby } from 'globby';

const files = await globby('**/*', {
  cwd: repoRoot,
  gitignore: true,
  dot: true,
  onlyFiles: true,
});
```

---

## 4. Import Convention (ESM + tsc)

**Decision**: Use `.js` extensions on all local relative imports in `.ts` source files.

**Rationale**: tsconfig uses `"module": "ESNext"` and `"moduleResolution": "bundler"`. tsc does not rewrite import specifiers. Node.js ESM requires explicit file extensions for local imports. Therefore `.ts` source files must reference their sibling modules as `.js` (the compiled output extension) so that the emitted JavaScript resolves correctly at runtime.

**Example**:
```typescript
// src/cli/commands/status/status-command.ts
import { loadStackfile } from '../../../stackfile/stackfile-loader.js';
```

---

## 5. CLI Entry-Point Shebang and `bin` Registration

**Decision**: `src/cli/main.ts` carries a `#!/usr/bin/env node` comment at the top (emitted verbatim by tsc into `dist/cli/main.js`). The `bin` field in `package.json` maps `"stacklens"` to `"./dist/cli/main.js"`.

**Rationale**: Node.js infers ESM from `"type": "module"` in `package.json`; no additional flags in the shebang are required. The shebang is treated as a comment by TypeScript and preserved in output.

---

## 6. Exit Code Conventions

**Decision**: Adopt standard Unix convention as stated in the spec.

| Situation | Exit Code |
|---|---|
| Valid Stackfile, zero uncovered files | `0` |
| Help printed (`--help`, `stacklens` with no args) | `0` |
| Uncovered files found | `1` |
| Stackfile not found | `1` |
| Stackfile validation error | `1` |
| Stackfile I/O error | `1` |
| Unknown command | `1` (Commander default) |

**Implementation note**: Commander's default `process.exit` handling suffices for help and unknown-command exits. The `status` action handler calls `process.exit(1)` explicitly for all error paths.

---

## 7. Testing Strategy

**Decision**: Node.js built-in `node:test` with colocated `*.test.ts` files (compiled to `dist/**/*.test.js`).

**Rationale**: Mandated by constitution (§ Implementation Standards) and the project's existing `"test"` script. No external test framework is added.

**Test isolation for the `status` command**: The action handler must accept injectable dependencies (loader, validator, scanner, analyzer functions) so tests can pass in-memory stubs without touching the real filesystem.

**Pattern**: Each module under test exposes a functional API (pure functions or async functions). The CLI action handler wires them together and is tested at the integration level using fixture files in a `specs/001-minimal-cli/fixtures/` directory.

---

## 8. New Dependencies Summary

| Package | Version | Role | Type |
|---|---|---|---|
| `commander` | `^14.0.0` | CLI framework | `dependencies` |
| `yaml` | `^2.8.0` | YAML parser | `dependencies` |
| `globby` | `^16.1.0` | File enumeration with gitignore | `dependencies` |

`glob` remains a devDependency (used by existing build scripts only).

---

## 9. Unresolved Questions

None. All NEEDS CLARIFICATION items from Technical Context are resolved above.

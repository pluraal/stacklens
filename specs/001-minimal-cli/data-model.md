# Data Model: Minimal CLI

**Phase**: 1 — Design & Contracts  
**Feature Branch**: `001-minimal-cli`

---

## Overview

This document defines the TypeScript type system for the minimal CLI feature. All types live under `src/` and are compiled to `dist/`. Public-facing types are re-exported through `src/index.ts`. Internal types live in their own module.

---

## 1. Stackfile Types (`src/stackfile/types.ts`)

### 1.1 Raw Parsed Input

```typescript
/**
 * Raw output of the YAML parser before validation.
 * Typed as unknown at the boundary; narrowed by the validator.
 */
type StackfileRaw = unknown;
```

### 1.2 Validated Domain Model

```typescript
/** Validated detection rules for a single technology (v0: include-only). */
interface DetectRules {
  /** One or more POSIX-style glob patterns evaluated relative to the repository root. */
  readonly include: readonly string[];
}

/** A validated Technology node in the single-inheritance hierarchy. */
interface Technology {
  /** Unique identifier within the resolved definition set. */
  readonly id: string;
  /** Parent technology id. Absent for root technologies. */
  readonly parent?: string;
  /** Detection rules. Required on every technology node. */
  readonly detect: DetectRules;
  /** Optional flat annotation tags (do not participate in hierarchy). */
  readonly tags?: readonly string[];
  /** Optional human-readable description. */
  readonly description?: string;
}

/** A validated, fully-typed Stackfile document. */
interface StackfileV0 {
  /** Must equal "0.1". */
  readonly version: '0.1';
  /** Optional imports section (v0: present but not resolved). */
  readonly imports?: readonly ImportEntry[];
  /** Resolved list of local technology definitions. */
  readonly technologies: readonly Technology[];
}

/** A single import entry (resolution is out of scope for v0 CLI). */
interface ImportEntry {
  readonly source: string;
  readonly version: string;
}
```

### 1.3 Validation Error Model

```typescript
/** A single structured validation error produced by StackfileValidator. */
interface ValidationError {
  /** Machine-readable error code for programmatic handling. */
  readonly code: ValidationErrorCode;
  /** Human-readable description; used verbatim in CLI output. */
  readonly message: string;
  /**
   * Optional path within the Stackfile document to the offending field
   * (e.g., "technologies[2].parent"). Used to give precise error location.
   */
  readonly path?: string;
}

type ValidationErrorCode =
  | 'MISSING_VERSION'
  | 'UNSUPPORTED_VERSION'
  | 'UNKNOWN_TOP_LEVEL_KEY'
  | 'MISSING_TECHNOLOGIES'
  | 'DUPLICATE_TECHNOLOGY_ID'
  | 'MISSING_TECHNOLOGY_ID'
  | 'MISSING_DETECT_INCLUDE'
  | 'EMPTY_DETECT_INCLUDE'
  | 'UNKNOWN_PARENT'
  | 'CYCLIC_INHERITANCE';
```

### 1.4 Validation Result

```typescript
/** Tagged-union result returned by StackfileValidator. */
type ValidationResult =
  | { readonly ok: true; readonly value: StackfileV0 }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };
```

---

## 2. Coverage Types (`src/coverage/types.ts`)

```typescript
/** A file path relative to the repository root. */
type RelativeFilePath = string;

/** Result of running coverage analysis against a validated Stackfile. */
interface CoverageResult {
  /** All files enumerated under the repository root (gitignore excluded). */
  readonly totalFiles: number;
  /** Files not matched by any technology's detection rules. */
  readonly uncoveredFiles: readonly RelativeFilePath[];
}
```

---

## 3. Module Responsibilities

### `src/stackfile/stackfile-loader.ts`

```
Input:  filePath: string (absolute path to .stack file)
Output: Promise<string>  (raw YAML text)
Throws: StackfileNotFoundError | StackfileIOError
```

Reads the raw file content. Does not parse or validate. Single responsibility: file I/O.

### `src/stackfile/stackfile-parser.ts`

```
Input:  raw: string (YAML text)
Output: unknown (parsed YAML object)
Throws: StackfileParseError (on YAML syntax error)
```

Wraps `yaml.parse()`. Returns `unknown` for the validator to narrow.

### `src/stackfile/stackfile-validator.ts`

```
Input:  raw: unknown (parsed YAML)
Output: ValidationResult
```

Pure function. No I/O. Validates all v0 rules:
1. Top-level keys (only `version`, `imports`, `technologies` allowed)
2. `version` present and equals `"0.1"`
3. `technologies` present and is an array
4. Each technology has a unique `id`
5. Each technology has `detect.include` with at least one pattern
6. All `parent` references point to existing `id` values
7. Hierarchy is acyclic (depth-first cycle detection)

### `src/coverage/file-scanner.ts`

```
Input:  repoRoot: string (absolute directory path)
Output: Promise<readonly RelativeFilePath[]>
```

Uses `globby` with `{ gitignore: true, cwd: repoRoot }` to enumerate files. Excludes `.git/` directory. Returns paths relative to `repoRoot`.

### `src/coverage/coverage-analyzer.ts`

```
Input:  files: readonly RelativeFilePath[], stackfile: StackfileV0
Output: CoverageResult
```

Pure function. Evaluates each technology's `detect.include` glob patterns (using `micromatch`, the same engine used internally by `globby → fast-glob`) against every file path. A file is "covered" if at least one technology's pattern matches it. Returns `CoverageResult`.

> **Note on same-depth conflict**: The v0 resolution algorithm requires an error when two technologies at the same hierarchy depth match the same file. The validator runs only structural validation. The coverage analyzer detects runtime same-depth conflicts and surfaces them as errors during the analysis phase (they cause the `status` command to exit non-zero).

### `src/cli/program.ts`

Creates and exports a Commander `Command` instance pre-configured with:
- `name('stacklens')`
- `description(...)`
- `version(...)` derived from `package.json`
- `addHelpCommand(false)` (no auto-added `help` subcommand)
- `showHelpAfterError(false)`

### `src/cli/commands/status/status-command.ts`

Exports `register(program: Command): void`. Adds the `status` subcommand with:
- Description
- Action handler that orchestrates: load → parse → validate → scan → analyze → report

### `src/cli/main.ts`

Entry point. Imports `program` and all `register` functions. Calls `register(program)` for each command. Handles the no-args case (print help, exit 0). Calls `await program.parseAsync(process.argv)`.

---

## 4. State Transitions for `stacklens status`

```
┌─────────────────────────────────────────────────────────────────────┐
│                         stacklens status                            │
└─────────────────────────────────────────────────────────────────────┘
           │
           ▼
   ┌───────────────┐
   │ Locate .stack │──── Not found ────► stderr: "Stackfile not found"
   └───────────────┘                     exit(1)
           │ Found
           ▼
   ┌───────────────┐
   │  Read .stack  │──── I/O error ───► stderr: "<error message>"
   └───────────────┘                    exit(1)
           │ Contents
           ▼
   ┌───────────────┐
   │  Parse YAML   │──── Parse error ─► stderr: "Invalid YAML: <msg>"
   └───────────────┘                    exit(1)
           │ raw: unknown
           ▼
   ┌───────────────────┐
   │ Validate Stackfile│──── Errors ──► stderr: each error, one per line
   └───────────────────┘               exit(1)
           │ StackfileV0
           ▼
   ┌───────────────────┐
   │  Enumerate files  │
   │  (globby+gitignore│
   └───────────────────┘
           │ string[]
           ▼
   ┌─────────────────────┐
   │  Coverage analysis  │──── Same-depth ─► stderr: conflict description
   └─────────────────────┘     conflict        exit(1)
           │ CoverageResult
           ▼
   ┌─────────────────┐         ┌──────────────────────────────────────┐
   │ uncoveredFiles  │── > 0 ──► stdout: each path, one per line      │
   │    .length      │          stderr: "N uncovered file(s) found"   │
   └─────────────────┘          exit(1)                               │
           │ == 0                └──────────────────────────────────────┘
           ▼
   stdout: "✓ Stackfile valid. All files are covered."
   exit(0)
```

---

## 5. Error Types (Custom Error Classes)

```typescript
/** Thrown when the Stackfile cannot be located. */
class StackfileNotFoundError extends Error {
  constructor(searchPath: string) {
    super(`Stackfile not found at: ${searchPath}`);
    this.name = 'StackfileNotFoundError';
  }
}

/** Thrown on filesystem read failure. */
class StackfileIOError extends Error {
  constructor(filePath: string, cause: unknown) {
    super(`Failed to read Stackfile at: ${filePath}`);
    this.name = 'StackfileIOError';
    this.cause = cause;
  }
}

/** Thrown when the YAML content is syntactically invalid. */
class StackfileParseError extends Error {
  constructor(message: string) {
    super(`Invalid YAML: ${message}`);
    this.name = 'StackfileParseError';
  }
}
```

---

## 6. Validation Rules Cross-Reference

| Rule | Source | ValidationErrorCode |
|---|---|---|
| `version` field missing | stackfile-v0.md §7 | `MISSING_VERSION` |
| `version` value not `"0.1"` | stackfile-v0.md §7 | `UNSUPPORTED_VERSION` |
| Unknown top-level key | stackfile-v0.md §1 | `UNKNOWN_TOP_LEVEL_KEY` |
| `technologies` missing | stackfile-v0.md §1 | `MISSING_TECHNOLOGIES` |
| Duplicate technology `id` | stackfile-v0.md §2.2 | `DUPLICATE_TECHNOLOGY_ID` |
| Technology without `id` | stackfile-v0.md §2.1 | `MISSING_TECHNOLOGY_ID` |
| Technology without `detect.include` | stackfile-v0.md §2.3 | `MISSING_DETECT_INCLUDE` |
| `detect.include` is empty | stackfile-v0.md §2.3 | `EMPTY_DETECT_INCLUDE` |
| `parent` references unknown id | stackfile-v0.md §2.2 | `UNKNOWN_PARENT` |
| Cyclic inheritance | stackfile-v0.md §2.2 | `CYCLIC_INHERITANCE` |

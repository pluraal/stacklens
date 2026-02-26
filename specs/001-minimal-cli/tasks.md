# Tasks: Minimal CLI

**Input**: Design documents from `/specs/001-minimal-cli/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Included — colocated `*.test.ts` files per project constitution; all tests use `node:test`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.
US1 (P1) is the full-pipeline MVP. US2–US4 add validation errors, help output, and unknown-command
robustness.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Exact file paths are included in every task description

---

## Phase 1: Setup

**Purpose**: Install runtime dependencies, register the binary, and scaffold the source directory
structure.

- [X] T001 Run `npm install commander@^14.0.0 yaml@^2.8.0 globby@^16.1.0` — installs all three runtime dependencies and updates `package.json` dependencies section
- [X] T002 Update `package.json`: add `"bin": { "stacklens": "./dist/cli/main.js" }` top-level field so the CLI is registered as a binary after `npm link` or global install
- [X] T003 Create source directory scaffold: `src/cli/`, `src/cli/commands/`, `src/cli/commands/status/`, `src/stackfile/`, `src/coverage/` (empty directories; add `.gitkeep` only if needed)
- [X] T004 [P] Create fixture root directory `specs/001-minimal-cli/fixtures/` with the six subdirectory stubs: `valid-all-covered/`, `valid-with-uncovered/`, `empty-technologies/`, `invalid-missing-version/`, `invalid-unknown-key/`, `invalid-cycle/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared TypeScript types, pure I/O modules, the full Stackfile validator, and the Commander
program factory — all prerequisites for every user story.

⚠️ **CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] Create `src/stackfile/types.ts`: define `DetectRules`, `Technology`, `ImportEntry`, `StackfileV0`, `ValidationError`, `ValidationErrorCode` (all 10 codes), `ValidationResult` tagged union, and the three custom error classes `StackfileNotFoundError`, `StackfileIOError`, `StackfileParseError` exactly as specified in `specs/001-minimal-cli/data-model.md §1`
- [X] T006 [P] Create `src/coverage/types.ts`: define `RelativeFilePath` type alias and `CoverageResult` interface as specified in `specs/001-minimal-cli/data-model.md §2`
- [X] T007 [P] Create `src/cli/program.ts`: export a `createProgram()` factory that returns a Commander `Command` configured with `name('stacklens')`, `description('Semantic technology stack projection toolkit')`, `version(...)` read from `package.json`, `addHelpCommand(false)`, and `showHelpAfterError(false)` per `specs/001-minimal-cli/contracts/cli-contract.md §1`
- [X] T008 [P] Implement `src/stackfile/stackfile-loader.ts`: export `loadStackfile(filePath: string): Promise<string>` — reads the `.stack` file and returns its UTF-8 contents; throws `StackfileNotFoundError` when the file does not exist, `StackfileIOError` for all other I/O failures
- [X] T009 [P] Implement `src/stackfile/stackfile-parser.ts`: export `parseStackfile(raw: string): unknown` — wraps `yaml.parse()` and throws `StackfileParseError` with the library's error message on any YAML syntax error
- [X] T010 Implement `src/stackfile/stackfile-validator.ts`: export `validateStackfile(raw: unknown): ValidationResult` — pure function (no I/O) enforcing all 10 v0 rules: allowed top-level keys, `version` present and equals `"0.1"`, `technologies` present and is an array, each technology has a unique non-empty `id`, each technology has `detect.include` with at least one string, all `parent` values reference an existing `id`, hierarchy is acyclic (depth-first cycle detection); returns `{ ok: true, value: StackfileV0 }` or `{ ok: false, errors: ValidationError[] }` per `specs/001-minimal-cli/data-model.md §3`
- [X] T011 [P] Write `src/stackfile/stackfile-loader.test.ts`: cover file-found path (returns raw YAML string), file-not-found path (throws `StackfileNotFoundError` with the searched path), and an unreadable-file path (throws `StackfileIOError`); use fixture files under `specs/001-minimal-cli/fixtures/` resolved via `import.meta.url`
- [X] T012 [P] Write `src/stackfile/stackfile-parser.test.ts`: cover valid YAML mapping (returns `unknown` object with expected keys), YAML syntax error (throws `StackfileParseError` whose message starts with `Invalid YAML:`), and empty-string input (returns `null` or `undefined` — verify and document behaviour)
- [X] T013 [P] Write `src/stackfile/stackfile-validator.test.ts`: one passing test for a fully valid Stackfile, and one test per `ValidationErrorCode` (10 tests) — `MISSING_VERSION`, `UNSUPPORTED_VERSION`, `UNKNOWN_TOP_LEVEL_KEY`, `MISSING_TECHNOLOGIES`, `DUPLICATE_TECHNOLOGY_ID`, `MISSING_TECHNOLOGY_ID`, `MISSING_DETECT_INCLUDE`, `EMPTY_DETECT_INCLUDE`, `UNKNOWN_PARENT`, `CYCLIC_INHERITANCE` — including a multi-hop cycle test (A → B → A and A → B → C → A)

**Checkpoint**: Foundational types, loader, parser, validator, and program factory are all complete.
All foundational tests pass after `npm run build && npm run test`.

---

## Phase 3: User Story 1 — `stacklens status` on a valid project (Priority: P1) 🎯 MVP

**Goal**: Full end-to-end `stacklens status` pipeline — load → parse → validate → scan → analyze →
report. Exits `0` when all files are covered; exits `1` and lists uncovered paths when coverage gaps
exist.

**Independent Test**: Run `node dist/cli/main.js status` from
`specs/001-minimal-cli/fixtures/valid-all-covered/` → exit `0`, stdout `✓ Stackfile valid. All files
are covered.`; run from `specs/001-minimal-cli/fixtures/valid-with-uncovered/` → exit `1`, stdout
contains `uncovered.xyz`.

### Fixtures

- [X] T014 [P] [US1] Create `specs/001-minimal-cli/fixtures/valid-all-covered/.stack`: a `version: "0.1"` Stackfile with one technology whose `detect.include` glob covers the only file present in that directory (e.g., `"**/*.stack"` matching `.stack` itself, or a dedicated marker file)
- [X] T015 [P] [US1] Create `specs/001-minimal-cli/fixtures/valid-with-uncovered/.stack` and `specs/001-minimal-cli/fixtures/valid-with-uncovered/uncovered.xyz`: the Stackfile covers only `*.stack` files so `uncovered.xyz` is intentionally left unmatched
- [X] T016 [P] [US1] Create `specs/001-minimal-cli/fixtures/empty-technologies/.stack`: a `version: "0.1"` Stackfile with `technologies: []` so every enumerated file is reported as uncovered

### Tests

- [X] T017 [P] [US1] Write `src/coverage/file-scanner.test.ts`: cover normal enumeration (returns relative paths with forward slashes), `.git/` directory excluded, paths are relative to the provided `repoRoot`, and empty fixture directory returns an empty array; use fixture directories resolved via `import.meta.url`
- [X] T018 [P] [US1] Write `src/coverage/coverage-analyzer.test.ts`: cover all-files-covered case (`uncoveredFiles: []`), one-file-uncovered case, all-files-uncovered when `technologies` is empty, glob pattern matching against nested paths, and same-depth conflict detection (two technologies at equal depth both matching the same file triggers an error); use in-memory file arrays and inline `StackfileV0` objects (no filesystem I/O)
- [X] T019 [US1] Write `src/cli/commands/status/status-command.test.ts` for US1 scenarios: valid Stackfile + all files covered (exit `0`, stdout matches `✓ Stackfile valid. All files are covered.`), valid Stackfile + uncovered files (exit `1`, uncovered paths appear on stdout sorted lexicographically, stderr contains `N uncovered file(s) found.`), empty technologies (exit `1`, all files reported); inject stub dependencies to avoid real filesystem I/O per `specs/001-minimal-cli/plan.md AD-2`

### Implementation

- [X] T020 [P] [US1] Implement `src/coverage/file-scanner.ts`: export `scanFiles(repoRoot: string): Promise<readonly RelativeFilePath[]>` using `globby` with `{ gitignore: true, cwd: repoRoot, dot: true, onlyFiles: true }`; normalise all returned paths to forward slashes; exclude `.git/` explicitly
- [X] T021 [US1] Implement `src/coverage/coverage-analyzer.ts`: export `analyzeCoverage(files: readonly RelativeFilePath[], stackfile: StackfileV0): CoverageResult` — pure function that applies each technology's `detect.include` patterns using `micromatch` (the glob engine bundled inside `globby → fast-glob → micromatch`, ensuring identical matching semantics with `file-scanner.ts`); add `micromatch` as an explicit `dependency` and `@types/micromatch` as a `devDependency` if TypeScript cannot resolve it via the transitive path; detects same-depth conflicts and throws a descriptive `Error` (caught by the status-command action handler); returns `CoverageResult` per `specs/001-minimal-cli/data-model.md §3`
- [X] T022 [US1] Implement `src/cli/commands/status/status-command.ts`: export `register(program: Command): void` that adds a `status` subcommand with the description from `contracts/cli-contract.md §2`; the action handler accepts injectable deps `(loader, parser, validator, scanner, analyzer)` defaulting to the real implementations; orchestrates the full load → parse → validate → scan → analyze → report state machine from `specs/001-minimal-cli/data-model.md §4`; writes uncovered file paths to stdout sorted lexicographically, summary count to stderr, all errors to stderr, and calls `process.exit(1)` on every error or coverage-gap path
- [X] T023 [US1] Implement `src/cli/main.ts`: add `#!/usr/bin/env node` shebang as the first line; import `createProgram` from `./program.js` and `register` from `./commands/status/status-command.js`; create the program, call `register(program)`, handle the no-args case (call `program.help()` which exits `0`), and call `await program.parseAsync(process.argv)`

**Checkpoint**: `npm run build && node dist/cli/main.js status` works end-to-end from both valid
fixture directories. US1 acceptance scenarios 1–3 all pass.

---

## Phase 4: User Story 2 — `stacklens status` with an invalid Stackfile (Priority: P2)

**Goal**: All validation-failure and I/O-failure paths produce human-readable error messages on stderr
and exit `1` without performing file scanning.

**Independent Test**: Run `node dist/cli/main.js status` from each invalid fixture directory — exit
`1`, stderr contains the appropriate `[CODE]` error tag and a human-readable description.

### Fixtures

- [X] T024 [P] [US2] Create `specs/001-minimal-cli/fixtures/invalid-missing-version/.stack`: a valid YAML file that is missing the `version` field entirely
- [X] T025 [P] [US2] Create `specs/001-minimal-cli/fixtures/invalid-unknown-key/.stack`: a Stackfile with `version: "0.1"` and `technologies: []` but also an unrecognised top-level key (e.g., `config: {}`)
- [X] T026 [P] [US2] Create `specs/001-minimal-cli/fixtures/invalid-cycle/.stack`: a Stackfile with `version: "0.1"` and two technologies whose `parent` fields form a cycle (e.g., `A` has `parent: B` and `B` has `parent: A`)

### Tests

- [X] T027 [US2] Extend `src/cli/commands/status/status-command.test.ts` with US2 scenarios (using injected stub dependencies): missing-version Stackfile (stderr contains `[MISSING_VERSION]`), unknown-key Stackfile (stderr contains `[UNKNOWN_TOP_LEVEL_KEY]`), cyclic-inheritance Stackfile (stderr contains `[CYCLIC_INHERITANCE]`), Stackfile not found (stderr matches `Stackfile not found at:`), YAML syntax error (stderr matches `Invalid YAML:`), I/O error (stderr matches `Failed to read Stackfile at:`); all cases exit `1` without calling the scanner

### Implementation

- [X] T028 [US2] Audit `src/cli/commands/status/status-command.ts` error branches against `specs/001-minimal-cli/contracts/output-format.md`: confirm validation errors render as `Stackfile validation failed:\n  [CODE] message` (one indented line per error), YAML errors render as `Invalid YAML: <msg>`, not-found renders as `Stackfile not found at: <path>`, all branches write to `process.stderr` and call `process.exit(1)`; make any adjustments needed to match the contract exactly

**Checkpoint**: US2 acceptance scenarios 1–3 pass. Every invalid fixture directory produces a
correctly formatted stderr message and exits `1`.

---

## Phase 5: User Story 3 — `--help` and no-args invocation (Priority: P3)

**Goal**: `stacklens --help`, `stacklens status --help`, and bare `stacklens` all exit `0` and display
accurate usage information matching `contracts/cli-contract.md §3–4`.

**Independent Test**: `node dist/cli/main.js --help` exits `0` and output contains `"status"`;
`node dist/cli/main.js status --help` exits `0` and output contains `"Validate the Stackfile"`;
`node dist/cli/main.js` with no arguments exits `0`.

### Tests

- [X] T029 [P] [US3] Write `src/cli/program.test.ts` test for `stacklens --help`: assert exit code `0` and that stdout contains `"stacklens"`, `"status"`, `"-V, --version"`, and `"-h, --help"` matching the expected output in `contracts/cli-contract.md §3`
- [X] T030 [P] [US3] Write test in `src/cli/program.test.ts` for `stacklens status --help`: assert exit code `0` and stdout contains `"Validate the Stackfile and report uncovered files"` and `"-h, --help"` per `contracts/cli-contract.md §4`
- [X] T031 [P] [US3] Write test in `src/cli/program.test.ts` for bare `stacklens` (no args): assert exit code `0` and stdout contains top-level help content (same assertions as `--help`)

### Implementation

- [X] T032 [US3] Review `src/cli/program.ts` and `src/cli/main.ts` against `contracts/cli-contract.md §1–4`: verify the description string, version source, `addHelpCommand(false)` setting, and no-args exit-`0` path all match; make any corrections identified by T029–T031 test failures

**Checkpoint**: US3 acceptance scenarios 1–3 pass. All `--help` invocations exit `0` with the content
specified in the CLI contract.

---

## Phase 6: User Story 4 — Unknown command (Priority: P4)

**Goal**: `stacklens <unknowncmd>` exits `1` with a clear "unknown command" error message directing
the user to `--help`.

**Independent Test**: `node dist/cli/main.js unknowncmd` exits `1` and stderr contains
`"error: unknown command 'unknowncmd'"`.

### Tests

- [X] T033 [US4] Write test in `src/cli/program.test.ts` for `stacklens unknowncmd`: assert exit code `1` and stderr contains `"error: unknown command 'unknowncmd'"` and `"See 'stacklens --help'"` per `contracts/cli-contract.md §5`

### Implementation

- [X] T034 [US4] Verify `src/cli/program.ts` Commander configuration does not suppress default unknown-command behaviour: confirm `allowUnknownOption()` is absent, no `exitOverride()` that would swallow the error; adjust if the T033 test identifies a deviation from the contract

**Checkpoint**: US4 acceptance scenario 1 passes. Mistyped commands are rejected with exit code `1`
and a helpful error message.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Wire up public API re-exports, verify build and CI health, and validate end-to-end
quickstart scenarios.

- [X] T035 [P] Update `src/index.ts` to re-export public types: `StackfileV0`, `Technology`, `DetectRules`, `ValidationResult`, `ValidationError`, `ValidationErrorCode`, `CoverageResult`, `RelativeFilePath` from `./stackfile/types.js` and `./coverage/types.js`
- [X] T036 [P] Verify `tsconfig.json` `"include": ["src/**/*"]` already covers all new source paths (no changes needed unless the glob is unexpectedly scoped); document as a no-op if confirmed
- [X] T037 Run `npm run build` and fix all TypeScript compilation errors — pay special attention to strict mode violations, `noUncheckedIndexedAccess` array access patterns, and missing `.js` extensions on local ESM imports (see `specs/001-minimal-cli/research.md §4`)
- [X] T038 Run `npm run test` and fix all failing test cases — ensure every `*.test.ts` file compiles and its assertions pass; confirm test count matches expected coverage across all modules
- [X] T039 Run `npm run ci` to validate the full pipeline: `typecheck + lint + lint:md + lint:md-links + build` — all checks must pass with no errors or warnings
- [X] T040 Manually validate `quickstart.md` usage scenarios: `node dist/cli/main.js --help` (matches §3 output), `node dist/cli/main.js status` in a directory with the example `.stack` from quickstart.md (exits `0`), `node dist/cli/main.js status` in `specs/001-minimal-cli/fixtures/invalid-missing-version/` (exits `1`, expected stderr)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Foundational — no dependencies on other user stories; this is the MVP
- **US2 (Phase 4)**: Depends on Foundational + US1 (`status-command.ts` error branches are extended, not replaced)
- **US3 (Phase 5)**: Depends on US1 (`main.ts` and `program.ts` must exist and compile)
- **US4 (Phase 6)**: Depends on US3 (`program.ts` must be fully configured)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

| Story | Depends on | Independently testable? |
|---|---|---|
| US1 (P1) | Foundational only | ✅ Full pipeline tested from valid fixture directories |
| US2 (P2) | Foundational + US1 | ✅ Error paths tested in isolation via injected stub deps |
| US3 (P3) | US1 (`main.ts`) | ✅ Help and no-args verified without a real Stackfile |
| US4 (P4) | US3 (configured `program.ts`) | ✅ Unknown-command verified without a real Stackfile |

### Within Each Phase

- Types (`T005`, `T006`) before any implementation that imports them
- Loader (`T008`) and parser (`T009`) can be implemented in parallel (different files)
- Validator (`T010`) depends on `T005` (types); its tests (`T013`) depend on `T010`
- `file-scanner.ts` (`T020`) and its test (`T017`) can run in parallel
- `coverage-analyzer.ts` (`T021`) depends on `T020` (imports `RelativeFilePath` and `StackfileV0`)
- `status-command.ts` (`T022`) depends on `T021` (full pipeline wired)
- `main.ts` (`T023`) depends on `T022` (registers the status command)

### Parallel Opportunities

**Phase 1**: T003 and T004 can run in parallel after T001–T002 complete
**Phase 2**: T005, T006, T007, T008, T009, T011, T012, T013 can all start simultaneously; T010 requires T005; T013 requires T010
**Phase 3**: T014–T018, T020 can all run in parallel; T019 needs fixture paths (T014–T016); T021 needs T020; T022 needs T021; T023 needs T022
**Phase 4**: T024–T026 can run in parallel; T027 requires T024–T026; T028 requires T027
**Phase 5**: T029–T031 can run in parallel; T032 addresses issues found by T029–T031
**Phase 6**: T033 then T034 sequentially
**Phase 7**: T035–T036 can run in parallel; T037–T040 must run sequentially after all code is finalized

---

## Parallel Example: Phase 3 (US1)

```bash
# These seven tasks can all start at the same time:
Task T014: "Create specs/001-minimal-cli/fixtures/valid-all-covered/.stack"
Task T015: "Create specs/001-minimal-cli/fixtures/valid-with-uncovered/.stack + uncovered.xyz"
Task T016: "Create specs/001-minimal-cli/fixtures/empty-technologies/.stack"
Task T017: "Write src/coverage/file-scanner.test.ts"
Task T018: "Write src/coverage/coverage-analyzer.test.ts"
Task T019: "Write src/cli/commands/status/status-command.test.ts" (US1 scenarios)
Task T020: "Implement src/coverage/file-scanner.ts"

# Then sequentially in dependency order:
Task T021: "Implement src/coverage/coverage-analyzer.ts" (needs T020)
Task T022: "Implement src/cli/commands/status/status-command.ts" (needs T021)
Task T023: "Implement src/cli/main.ts" (needs T022)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T013) — **CRITICAL: blocks all stories**
3. Complete Phase 3: User Story 1 (T014–T023)
4. **STOP and VALIDATE**: `npm run build && npm run test` — confirm US1 acceptance scenarios 1–3 pass
5. Demo or ship if ready

### Incremental Delivery

1. **Phases 1–2** (Foundation): Types, core modules, program factory → foundation ready
2. **Phase 3** (US1): Complete pipeline → **MVP** — `stacklens status` works on valid repos
3. **Phase 4** (US2): Validation errors → error resilience
4. **Phase 5** (US3): Help and no-args → discoverability
5. **Phase 6** (US4): Unknown-command → robustness
6. **Phase 7** (Polish): CI green, public API wired, quickstart validated

### Parallel Team Strategy

After Foundational phase (Phase 2) is complete:

- **Developer A**: US1 (file-scanner → coverage-analyzer → status-command → main.ts)
- **Developer B**: US2 fixtures + validation edge-case test extensions

After US1 is merged:

- **Developer A**: US2 error-branch audit (T028)
- **Developer B**: US3 help tests + program.ts adjustments (T029–T032)
- **Developer C**: US4 unknown-command test (T033–T034)

---

## Notes

- All `.ts` source files MUST use `.js` extensions on local relative imports (ESM + tsc convention — see `specs/001-minimal-cli/research.md §4`); e.g., `import { loadStackfile } from '../../../stackfile/stackfile-loader.js'`
- `micromatch` is used in T021 for glob matching in `coverage-analyzer.ts` because it is the engine already bundled inside `globby → fast-glob → micromatch` — this ensures identical matching semantics between file scanning and coverage analysis; if TypeScript cannot resolve it via the transitive path, run `npm install micromatch` and `npm install --save-dev @types/micromatch` before implementing T021
- Tests use `import.meta.url` + `new URL('../../../specs/...', import.meta.url).pathname` to resolve fixture paths from within compiled `dist/` test files — do not rely on `process.cwd()` in tests
- Each user story is independently completable and testable; avoid coupling implementations across story boundaries
- Commit after each phase (or logical group within a phase) before starting the next
- Stop at each **Checkpoint** to validate the story independently before moving on

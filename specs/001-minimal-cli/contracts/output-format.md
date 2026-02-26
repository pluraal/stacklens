# Output Format Contract

**Feature Branch**: `001-minimal-cli`

---

## Streams

| Stream | Purpose |
|---|---|
| `stdout` | Success output and coverage data (machine-readable) |
| `stderr` | Error messages and summary counts |

---

## Success Output (`stdout`)

### All files covered

```
✓ Stackfile valid. All files are covered.
```

### Uncovered files found

One relative file path per line, sorted lexicographically:

```
config/database.yml
src/utils/helpers.ts
src/utils/math.ts
```

No leading or trailing blank lines. No decorators. Paths are relative to the repository root and use forward slashes on all platforms.

---

## Error Output (`stderr`)

### Stackfile not found

```
Stackfile not found at: /absolute/path/to/.stack
```

### Stackfile I/O error

```
Failed to read Stackfile at: /absolute/path/to/.stack
```

### YAML syntax error

```
Invalid YAML: <parser message from 'yaml' library>
```

### Stackfile validation errors

```
Stackfile validation failed:
  [MISSING_VERSION] "version" field is required.
  [UNKNOWN_PARENT] technology "typescript-test" references unknown parent "typescript".
```

One `[CODE] message` entry per error, indented by two spaces. Errors appear in the order they are detected.

### Same-depth classification conflict (analysis-time)

```
Classification conflict: technologies "react" and "vue" both match "src/App.js" at the same depth.
```

### Uncovered file count summary (paired with stdout paths)

```
3 uncovered file(s) found.
```

This appears on `stderr` after all paths are written to `stdout`.

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | Success: valid Stackfile and zero uncovered files; or help was printed |
| `1` | Any error or uncovered files present |

No other exit codes are used.

---

## Format Invariants

1. Each file path is terminated by a newline (`\n`).
2. Paths use forward slashes regardless of OS.
3. Paths do not have a leading `./`.
4. Output is deterministic: for identical inputs the same lines appear in the same order.
5. `stdout` and `stderr` are independent streams; interleaving is not guaranteed when both are redirected to the same destination, but callers should not rely on interleave order.

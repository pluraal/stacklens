# Stackfile Specification v0

Status: Draft\
Version: 0.1\
File extension: `.stack`\
Format: YAML

This document defines the v0 specification of the Stackfile.

The Stackfile declares the technology ontology and artifact mappings for
a repository.

All behavior defined here must comply with `tech.md`.

------------------------------------------------------------------------

# 1. File Structure

A Stackfile MUST be a valid YAML document.

Top-level structure:

``` yaml
version: "0.1"

imports: []        # optional
technologies: []   # required
```

Fields:

-   `version` (required) --- Stackfile specification version
-   `imports` (optional) --- list of external technology definition
    sources
-   `technologies` (required) --- local technology definitions

Unknown top-level keys MUST result in validation failure.

------------------------------------------------------------------------

# 2. Core Concepts

## 2.1 Technology

A Technology is a node in a strict inheritance hierarchy.

Each technology MUST define:

``` yaml
- id: string              # required, unique within Stackfile
  parent: string|null     # required (null only for root)
  detect:                 # required
    include: []           # required
```

Optional fields:

``` yaml
  tags: []                # optional
  description: string     # optional
```

------------------------------------------------------------------------

## 2.2 Technology Identity

-   `id` MUST be unique within the resolved definition set.
-   `id` MUST be stable and deterministic.
-   `parent` MUST reference an existing technology id or be null.
-   Exactly one technology MUST have `parent: null` (the root).
-   Hierarchy MUST be acyclic.

------------------------------------------------------------------------

## 2.3 Detection Rules (v0)

v0 supports **file-level detection only**.

Detection schema:

``` yaml
detect:
  include:
    - glob-pattern
    - glob-pattern
```

Rules:

-   `include` MUST contain at least one glob pattern.
-   Glob patterns MUST be evaluated relative to repository root.
-   Pattern syntax MUST be deterministic and documented (POSIX-style
    globs).
-   No `exclude` field is supported in v0.

If multiple technologies match the same file:

1.  The deepest node in the hierarchy is selected as primary.
2.  All ancestor technologies are implicitly included.

If two technologies at the same depth match a file, validation MUST
fail.

------------------------------------------------------------------------

# 3. Region Model (v0 Scope)

In v0, each file is treated as a single region.

Region-level segmentation is reserved for future versions.

Classification result:

-   Exactly one most-specific technology per file.
-   Ancestors implicitly included.

------------------------------------------------------------------------

# 4. Tags

`tags` is an optional array of strings.

Constraints:

-   Tags MUST be flat (no hierarchy).
-   Tags MUST NOT define detection rules.
-   Tags MUST NOT reference parent technologies.
-   Tags are metadata only.

Example:

``` yaml
- id: typescript-test
  parent: typescript
  tags:
    - test
  detect:
    include:
      - "**/*.test.ts"
```

------------------------------------------------------------------------

# 5. Imports

Imports allow reuse of external technology definitions.

Structure:

``` yaml
imports:
  - source: string
    version: string
```

Rules:

-   `source` MUST be a resolvable identifier (registry semantics defined
    externally).
-   `version` MUST be explicit.
-   Import resolution MUST be deterministic.
-   After resolution, imported technologies behave as if declared before
    local ones.

Override rule:

-   Local technology definitions override imported definitions with the
    same `id`.

StackLens MUST function without imports.

------------------------------------------------------------------------

# 6. Resolution Algorithm

Given:

-   Repository file list
-   Resolved technology definitions (imports + local)

Classification algorithm:

1.  Validate hierarchy:

    -   Single root
    -   No cycles
    -   All parents exist

2.  Sort technologies by depth (root first).

3.  For each file:

    -   Evaluate all `include` patterns.
    -   Collect matching technologies.
    -   If none match → file is unclassified.
    -   If one matches → classify.
    -   If multiple match:
        -   Select deepest technology.
        -   If multiple at same depth → error.

4.  Propagate classification upward via parent chain.

Resolution MUST NOT depend on evaluation order.

------------------------------------------------------------------------

# 7. Validation Rules

A Stackfile is invalid if:

-   `version` is missing or unsupported
-   Multiple roots exist
-   No root exists
-   Cyclic inheritance exists
-   Parent references missing technology
-   Duplicate technology ids exist
-   Same-depth conflict occurs during classification

Validation MUST occur before classification.

------------------------------------------------------------------------

# 8. Minimal Example

``` yaml
version: "0.1"

technologies:

  - id: artifact
    parent: null
    detect:
      include:
        - "**/*"

  - id: language
    parent: artifact
    detect:
      include:
        - "**/*.ts"
        - "**/*.js"

  - id: typescript
    parent: language
    detect:
      include:
        - "**/*.ts"

  - id: typescript-test
    parent: typescript
    tags:
      - test
    detect:
      include:
        - "**/*.test.ts"
        - "**/*.spec.ts"
```

------------------------------------------------------------------------

# 9. Non-Goals (v0)

The following are explicitly out of scope:

-   Region-level segmentation
-   Multiple inheritance
-   Exclusion rules
-   Embedded language detection
-   Execution semantics
-   Automatic mutation of `.gitignore`
-   Network-dependent resolution

These may be introduced in future versions.

------------------------------------------------------------------------

# 10. Versioning

Future Stackfile versions MUST:

-   Explicitly increment the version string
-   Preserve deterministic resolution
-   Maintain backward compatibility or provide migration guidance

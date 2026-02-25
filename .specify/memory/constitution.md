<!--
Sync Impact Report
Version: 1.0.0 (initial constitution)
Date: 2026-02-25

Principles Established:
- I. Explicitness Over Inference
- II. Deterministic Resolution
- III. Technology Ontology Model
- IV. Region-Level Granularity
- V. Tags as Flat Annotations
- VI. Importable Technology Definitions
- VII. Separation of Concerns
- VIII. Gitignore as Derived Projection
- IX. Backward Compatibility Discipline
- X. Minimal Core, Layered Extensions

Sections Added:
- Core Principles (10 technical invariants)
- Implementation Standards
- Development Workflow
- Governance

Templates Status:
- ✅ Constitution template instantiated
- ✅ plan-template.md: Updated Constitution Check section with specific gates
- ✅ .github/copilot-instructions.md: Added constitution reference and governance note
- ✅ spec-template.md: Reviewed - aligns with principle-driven requirements (no changes needed)
- ✅ tasks-template.md: Reviewed - aligns with user-story organization (no changes needed)
- ✅ checklist-template.md: Not reviewed yet (deferred - not critical for constitution)
- ✅ agent-file-template.md: Not reviewed yet (deferred - not critical for constitution)

Follow-up Actions:
- None required for immediate constitution adoption
- Future: Review agent files for principle alignment when updating agent workflows
-->

# StackLens Constitution

## Core Principles

### I. Explicitness Over Inference

StackLens MUST NOT rely on hidden heuristics or implicit behavior.

- Technologies MUST be explicitly declared in the Stackfile
- Imports MUST be explicitly referenced with stable versions
- Detection MAY suggest mappings, but suggestions MUST NOT alter state implicitly
- All projections MUST be derivable from declared configuration

**Rationale**: The Stackfile is the authoritative source of truth. Implicitness erodes reliability and reproducibility, especially in AI-assisted development environments where understanding is the primary constraint.

### II. Deterministic Resolution

StackLens MUST produce identical classification results across all environments.

Given identical inputs (repository state, Stackfile, imported definitions), the output MUST be deterministic.

Resolution MUST NOT depend on:

- Network availability
- Runtime environment variables
- Hidden caches
- Implicit ordering

**Rationale**: Determinism is mandatory for StackLens to function as infrastructure. AI systems and build pipelines require reproducible results.

### III. Technology Ontology Model

Technologies form a strict single-inheritance tree:

- Each technology has at most one parent
- The hierarchy MUST be acyclic
- Root technologies exist without parents
- Inheritance implies semantic specialization, not exclusion

For any classified region, the **deepest matching technology** in the hierarchy is the primary classification. All ancestors are implicitly included. Same-depth conflicts MUST fail validation.

**Rationale**: Single inheritance preserves semantic clarity. Multiple inheritance introduces ambiguity incompatible with deterministic resolution.

### IV. Region-Level Granularity

Classification operates at the **region level**, not merely the file level.

A file is a container of one or more regions. Each region:

- Is bound to exactly one most-specific technology
- Inherits all ancestor technologies
- May carry zero or more tags

v0 treats each file as a single region. Future versions MAY introduce finer-grained segmentation through deterministic parsing mechanisms.

**Rationale**: Real-world artifacts contain multiple technological layers. Region-level classification reflects compositional reality while maintaining semantic precision.

### V. Tags as Flat Annotations

Tags are flat, orthogonal metadata:

- Tags MUST NOT participate in inheritance
- Tags MUST NOT define detection rules
- Tags MUST NOT own files or regions

Tags are descriptive attributes, not ontology nodes. Examples: `test`, `generated`, `embedded`, `config`.

**Rationale**: Tags provide non-hierarchical classification dimensions. Conflating tags with the ontology creates ambiguous semantics and circular dependencies.

### VI. Importable Technology Definitions

StackLens supports optional imports of external, versioned technology definitions.

Resolution rules:

1. Imported definitions load before local overrides
2. Local Stackfile definitions override imported definitions with matching `id`
3. Imported definitions MUST be versioned
4. Resolution MUST be deterministic and offline-capable once locked

The system MUST function without any registry dependency. Imports enhance reuse but are not required.

**Rationale**: Centralization is optional; explicit declaration is mandatory. Local repositories retain full authority while benefiting from shared standards.

### VII. Separation of Concerns

StackLens is a **semantic classification layer**.

It MUST NOT:

- Execute code
- Replace build systems or dependency managers
- Control runtime behavior
- Mutate repository state without explicit user action

StackLens describes technological structure; it does not orchestrate execution.

**Rationale**: Clear boundaries prevent scope creep and maintain composability with existing tooling ecosystems.

### VIII. Gitignore as Derived Projection

Technology definitions MAY declare artifact paths. StackLens MAY generate `.gitignore` suggestions as a projection.

However:

- StackLens MUST NOT mutate `.gitignore` automatically
- Version control behavior remains external
- Git integration is optional and non-core

**Rationale**: Projections are derived capabilities, not core concerns. Automatic mutation violates user agency and introduces fragility.

### IX. Backward Compatibility Discipline

Once the Stackfile format is versioned:

- Breaking changes REQUIRE explicit version increments
- Semantic meaning MUST NOT change silently within a version
- Migration paths MUST be documented

StackLens is intended to become infrastructure. Stability is mandatory.

**Rationale**: StackLens aspires to infrastructure status. Breaking changes without migration paths erode trust and adoption.

### X. Minimal Core, Layered Extensions

The core StackLens specification MUST remain minimal:

- Ontology definition
- Region classification
- Deterministic resolution

Visualization tools, IDE integrations, and advanced analysis MUST layer on top of the core model rather than expanding it.

**Rationale**: Complexity is the enemy of reliability. A minimal core enables diverse extensions without sacrificing foundational integrity.

## Implementation Standards

### Pure ESM and TypeScript Discipline

- TypeScript 5.x targeting ES2022 output
- Pure ES modules only; no CommonJS (`require`, `module.exports`)
- `noUncheckedIndexedAccess` enabled; guard all indexed access
- No `any` type; use `unknown` with narrowing
- Unused variables are errors; prefix with `_` if intentionally unused

### Testing Requirements

- Colocated tests as `*.test.ts` files
- Use Node.js built-in `node:test` runner (no external framework)
- Build before testing: `npm run build && node --test dist/**/*.test.js`
- Tests MUST validate determinism for core resolution logic

### Code Organization

- Filenames use kebab-case (e.g., `stackfile-parser.ts`)
- Public API exports through `src/index.ts` only
- Specs directory (`specs/`) is authoritative documentation, not compiled code
- Implementations MUST stay synchronized with specs

### Workflow Commands

```bash
npm run typecheck   # Type-check without emitting
npm run lint        # ESLint with typescript-eslint
npm run build       # Compile to dist/
npm run test        # Run tests (must build first)
npm run ci          # Full validation pipeline
```

## Development Workflow

### Specification Authority

The `specs/` directory contains the authoritative design:

- `product.md`: Vision and problem statement
- `tech.md`: Technical invariants and principles
- `stackfile-v0.md`: Stackfile format specification

**All implementation decisions MUST defer to specifications.** Specs are not derived from code; code is derived from specs.

### Change Process

1. **Spec First**: Design changes begin in spec documents
2. **Review**: Spec changes require explicit review for principle violations
3. **Implementation**: Code implements validated spec changes
4. **Test**: Tests validate conformance to spec requirements
5. **CI Gate**: `npm run ci` must pass before merge

### Early-Stage Flexibility

StackLens is early-stage (v0.0.1). `src/` is scaffolding; rapid iteration is expected. However:

- Technical principles (specs/tech.md) are **non-negotiable**
- Breaking changes to Stackfile format require version bumps
- Public API contracts require deprecation paths once stabilized

## Governance

### Amendment Process

1. Proposed amendments MUST document:
   - Principle added/modified/removed
   - Rationale and impact analysis
   - Migration path if breaking
2. Amendments require version bump:
   - **MAJOR**: Backward-incompatible principle removals or redefinitions
   - **MINOR**: New principles or materially expanded guidance
   - **PATCH**: Clarifications, wording, non-semantic refinements
3. Constitution supersedes all other practices
4. Template consistency: Amendments trigger review of plan/spec/task templates

### Compliance Verification

- All PRs MUST verify principle compliance
- Spec-implementation divergence is a critical bug
- Violations of determinism or explicitness principles warrant immediate remediation

### Living Document

This constitution evolves with the project but never silently. Changes are explicit, versioned, and documented in the Sync Impact Report.

**Version**: 1.0.0 | **Ratified**: 2026-02-25 | **Last Amended**: 2026-02-25

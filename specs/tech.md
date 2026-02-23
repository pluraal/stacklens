# StackLens Technical Principles

This document defines the technical invariants that govern the design and evolution of StackLens.

These principles constrain implementation decisions and ensure long-term conceptual integrity.

---

## 1. Explicitness Over Inference

StackLens does not rely on hidden heuristics.

- Technologies MUST be explicitly declared in the Stackfile.
- Imports MUST be explicitly referenced.
- Detection MAY suggest mappings, but suggestions MUST NOT alter state implicitly.
- All projections MUST be derivable from declared configuration.

The Stackfile is the authoritative source of truth.

---

## 2. Deterministic Resolution

StackLens MUST be deterministic.

Given:

- A repository state
- A Stackfile
- Imported technology definitions

The classification result MUST be identical across environments.

Resolution MUST NOT depend on:

- Network availability
- Runtime environment variables
- Hidden caches
- Implicit ordering

All imports must resolve to stable, versioned definitions.

---

## 3. Technology Ontology Model

### 3.1 Single Inheritance Tree

Technologies form a strict tree:

- Each technology has at most one parent.
- The hierarchy MUST be acyclic.
- A root technology MUST exist.

Inheritance implies semantic specialization.

Example:

- `typescript` extends `language`
- `typescript-test` extends `typescript`

Specialization replaces exclusion. Subtypes refine parent technologies rather than negate them.

---

### 3.2 Most-Specific Classification Rule

For any classified region:

- The deepest matching technology in the hierarchy is the primary classification.
- All ancestors are implicitly included.

No ambiguous primary classification is allowed.

---

## 4. Region-Level Granularity

Classification operates at the region level.

A file is a container of one or more regions.

Each region:

- Is bound to exactly one most-specific technology.
- May inherit parent technologies.
- May carry zero or more tags.

File-level classification is a special case of a single-region file.

Region detection MAY initially be file-pattern based.
More granular detection MAY be introduced through deterministic parsing mechanisms.

---

## 5. Tags

Tags are flat, orthogonal annotations.

- Tags DO NOT participate in inheritance.
- Tags DO NOT define detection rules.
- Tags DO NOT own files or regions.

Tags are descriptive attributes, not ontology nodes.

Examples:

- `test`
- `generated`
- `embedded`
- `config`

Tags must not be used to simulate multiple inheritance.

---

## 6. Importable Technology Definitions

StackLens supports optional imports of external technology definitions.

Resolution rules:

1. Imported definitions load before local overrides.
2. Local Stackfile definitions override imported definitions.
3. Imported definitions MUST be versioned.
4. Resolution MUST be deterministic and offline-capable once locked.

The system MUST function without any registry dependency.

Imports enhance reuse but are not required.

---

## 7. Separation of Concerns

StackLens is a semantic classification layer.

It MUST NOT:

- Execute code
- Replace build systems
- Replace dependency managers
- Control runtime behavior

It describes technological structure.
It does not orchestrate execution.

---

## 8. Gitignore as Derived Projection

Technology definitions MAY declare artifact paths.

StackLens MAY generate `.gitignore` suggestions as a projection.

However:

- StackLens MUST NOT mutate `.gitignore` automatically.
- Version control behavior remains external.
- Git integration is optional and non-core.

---

## 9. Backward Compatibility Discipline

Once the Stackfile format is versioned:

- Breaking changes REQUIRE explicit version increments.
- Semantic meaning MUST NOT change silently.
- Migration paths MUST be documented.

StackLens is intended to become infrastructure. Stability is mandatory.

---

## 10. Minimal Core, Layered Extensions

The core StackLens specification MUST remain minimal:

- Ontology definition
- Region classification
- Deterministic resolution

Visualization tools, IDE integrations, and advanced analysis MUST layer on top of the core model rather than expanding it.

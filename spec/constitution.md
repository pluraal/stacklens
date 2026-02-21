# StackLens Constitution

This constitution defines the non-negotiable principles that govern the evolution of StackLens.

All specifications, features, and implementations MUST comply with these principles.

---

## 1. Explicitness Over Inference

StackLens exists to make implicit technology composition explicit.

- Technology membership MUST be declared, not silently inferred.
- Heuristics MAY assist authors but MUST NOT replace explicit declarations.
- All projections MUST be derivable solely from declared data.

The Stackfile is the source of truth.

---

## 2. Deterministic Projections

StackLens MUST produce deterministic outputs.

- Given the same Stackfile and repository state, projections MUST be identical.
- No hidden state, environment dependence, or implicit behavior is allowed.
- Ambiguity in layer membership MUST be resolved by explicit rules.

Predictability is more important than convenience.

---

## 3. Many-to-Many Technology Mapping

A file MAY belong to multiple technologies.

StackLens MUST support:

- Many-to-many file-to-technology relationships
- Future support for partial file segmentation
- Clear and composable mapping semantics

The model MUST reflect real-world stack overlap.

---

## 4. Tooling Neutrality

StackLens is a semantic layer, not a build system.

StackLens MUST NOT:

- Execute code
- Replace dependency managers
- Replace build tools
- Impose framework-specific assumptions

It describes technology composition.
It does not control it.

---

## 5. Human-Readable First

The Stackfile format MUST remain:

- Human-readable
- Reviewable in version control
- Simple enough to understand without specialized tooling

Machine optimization MUST NOT compromise readability.

---

## 6. AI-Assisted, Human-Controlled

StackLens is designed for AI-assisted development, but:

- AI MAY assist in generating or maintaining Stackfiles.
- Humans remain the authority over declarations.
- No AI inference may silently alter declared structure.

Automation must increase clarity, not obscure it.

---

## 7. Backward Compatibility Discipline

Once the Stackfile format is versioned:

- Breaking changes MUST require explicit version increments.
- Migration paths MUST be documented.
- Silent semantic changes are prohibited.

StackLens aims to become foundational infrastructure; stability is mandatory.

---

## 8. Separation of Concerns

StackLens separates:

- File system structure
- Technology composition
- Execution behavior

The system MUST preserve this separation.

No feature may collapse these dimensions into one.

---

## 9. Minimal Core

The core StackLens specification MUST remain minimal.

Features that are:

- Visualization-specific
- IDE-specific
- Platform-specific

MUST be layered on top of the core, not embedded within it.

The standard comes first. Tooling follows.

---

## Amendment Process

Changes to this constitution require:

- Explicit documentation of the change
- Justification aligned with the vision
- Clear explanation of long-term impact

This document exists to preserve conceptual integrity over time.

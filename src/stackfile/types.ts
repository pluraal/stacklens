/**
 * Stackfile v0 domain types and error classes.
 */

/** Validated detection rules for a single technology (v0: include-only). */
export interface DetectRules {
  /** One or more POSIX-style glob patterns evaluated relative to the repository root. */
  readonly include: readonly string[];
}

/** A validated Technology node in the single-inheritance hierarchy. */
export interface Technology {
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

/** A single import entry (resolution is out of scope for v0 CLI). */
export interface ImportEntry {
  readonly source: string;
  readonly version: string;
}

/** A validated, fully-typed Stackfile document. */
export interface StackfileV0 {
  /** Must equal "0.1". */
  readonly version: '0.1';
  /** Optional imports section (v0: present but not resolved). */
  readonly imports?: readonly ImportEntry[];
  /** Resolved list of local technology definitions. */
  readonly technologies: readonly Technology[];
}

/** Machine-readable error codes for validation failures. */
export type ValidationErrorCode =
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

/** A single structured validation error produced by the Stackfile validator. */
export interface ValidationError {
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

/** Tagged-union result returned by StackfileValidator. */
export type ValidationResult =
  | { readonly ok: true; readonly value: StackfileV0 }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };

/** Thrown when the Stackfile cannot be located. */
export class StackfileNotFoundError extends Error {
  constructor(searchPath: string) {
    super(`Stackfile not found at: ${searchPath}`);
    this.name = 'StackfileNotFoundError';
  }
}

/** Thrown on filesystem read failure. */
export class StackfileIOError extends Error {
  constructor(filePath: string, cause: unknown) {
    super(`Failed to read Stackfile at: ${filePath}`);
    this.name = 'StackfileIOError';
    this.cause = cause;
  }
}

/** Thrown when the YAML content is syntactically invalid. */
export class StackfileParseError extends Error {
  constructor(message: string) {
    super(`Invalid YAML: ${message}`);
    this.name = 'StackfileParseError';
  }
}

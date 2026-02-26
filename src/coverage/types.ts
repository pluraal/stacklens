/**
 * Coverage analysis types.
 */

/** A file path relative to the repository root. */
export type RelativeFilePath = string;

/** Result of running coverage analysis against a validated Stackfile. */
export interface CoverageResult {
  /** All files enumerated under the repository root (gitignore excluded). */
  readonly totalFiles: number;
  /** Files not matched by any technology's detection rules. */
  readonly uncoveredFiles: readonly RelativeFilePath[];
}

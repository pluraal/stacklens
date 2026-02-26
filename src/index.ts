/**
 * StackLens – semantic classification layer for software repositories.
 *
 * @remarks
 * Entry point; re-exports the public API surface.
 */
export const version = '0.0.1';

export type {
  StackfileV0,
  Technology,
  DetectRules,
  ImportEntry,
  ValidationResult,
  ValidationError,
  ValidationErrorCode,
} from './stackfile/types.js';

export {
  StackfileNotFoundError,
  StackfileIOError,
  StackfileParseError,
} from './stackfile/types.js';

export type { CoverageResult, RelativeFilePath } from './coverage/types.js';

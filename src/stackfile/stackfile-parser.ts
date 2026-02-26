import { parse } from 'yaml';
import { StackfileParseError } from './types.js';

/**
 * Parses raw YAML text into an unknown value for subsequent validation.
 *
 * @param raw - Raw YAML string content.
 * @returns The parsed value as `unknown`.
 * @throws {StackfileParseError} On any YAML syntax error.
 */
export function parseStackfile(raw: string): unknown {
  try {
    return parse(raw) as unknown;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new StackfileParseError(message);
  }
}

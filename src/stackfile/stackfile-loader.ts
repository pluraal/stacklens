import { readFile } from 'node:fs/promises';
import { StackfileIOError, StackfileNotFoundError } from './types.js';

/**
 * Reads the raw UTF-8 content of a `.stack` file.
 *
 * @param filePath - Absolute path to the `.stack` file.
 * @returns The raw YAML string content.
 * @throws {StackfileNotFoundError} When the file does not exist.
 * @throws {StackfileIOError} For all other filesystem read failures.
 */
export async function loadStackfile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (err) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      throw new StackfileNotFoundError(filePath);
    }
    throw new StackfileIOError(filePath, err);
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

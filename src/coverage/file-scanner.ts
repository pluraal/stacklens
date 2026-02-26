import { globby } from 'globby';
import type { RelativeFilePath } from './types.js';

/**
 * Enumerates all non-gitignored files under the given repository root.
 *
 * @param repoRoot - Absolute path to the repository root directory.
 * @returns Relative file paths (forward slashes, no leading `./`), sorted lexicographically.
 */
export async function scanFiles(repoRoot: string): Promise<readonly RelativeFilePath[]> {
  const files = await globby('**/*', {
    cwd: repoRoot,
    gitignore: true,
    dot: true,
    onlyFiles: true,
    ignore: ['.git/**'],
  });

  // Normalize to forward slashes and sort deterministically
  return files.map((f) => f.replace(/\\/g, '/')).sort();
}

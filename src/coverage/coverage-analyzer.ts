import micromatch from 'micromatch';
import type { StackfileV0 } from '../stackfile/types.js';
import type { CoverageResult, RelativeFilePath } from './types.js';

/**
 * Determines which files are covered by the Stackfile's technology detection rules.
 *
 * Pure function — no I/O.
 *
 * @param files - All files enumerated from the repository root.
 * @param stackfile - A validated Stackfile document.
 * @returns Coverage result with total file count and uncovered file paths.
 * @throws {Error} When two technologies at the same hierarchy depth both match the same file.
 */
export function analyzeCoverage(
  files: readonly RelativeFilePath[],
  stackfile: StackfileV0,
): CoverageResult {
  // Build a depth map: id → depth in the hierarchy
  const depthMap = buildDepthMap(stackfile);

  // For each file, track which (technology id, depth) pairs match it
  const coveredFiles = new Set<RelativeFilePath>();

  // Check for same-depth conflicts
  for (const file of files) {
    const matchingTechs: Array<{ id: string; depth: number }> = [];

    for (const tech of stackfile.technologies) {
      const patterns = tech.detect.include as string[];
      if (micromatch([file], patterns).length > 0) {
        const depth = depthMap.get(tech.id) ?? 0;
        matchingTechs.push({ id: tech.id, depth });
      }
    }

    if (matchingTechs.length >= 2) {
      // Check for same-depth conflict
      const depthCounts = new Map<number, string[]>();
      for (const { id, depth } of matchingTechs) {
        const existing = depthCounts.get(depth) ?? [];
        existing.push(id);
        depthCounts.set(depth, existing);
      }

      for (const [, ids] of depthCounts) {
        if (ids.length >= 2) {
          const id1 = ids[0]!;
          const id2 = ids[1]!;
          throw new Error(
            `Classification conflict: technologies "${id1}" and "${id2}" both match "${file}" at the same depth`,
          );
        }
      }
    }

    if (matchingTechs.length > 0) {
      coveredFiles.add(file);
    }
  }

  const uncoveredFiles = files.filter((f) => !coveredFiles.has(f));

  return {
    totalFiles: files.length,
    uncoveredFiles,
  };
}

/**
 * Computes hierarchy depth for each technology.
 * Root technologies (no parent) have depth 0.
 */
function buildDepthMap(stackfile: StackfileV0): Map<string, number> {
  const depthMap = new Map<string, number>();
  const parentMap = new Map<string, string>();

  for (const tech of stackfile.technologies) {
    if (tech.parent !== undefined) {
      parentMap.set(tech.id, tech.parent);
    }
  }

  function getDepth(id: string, visited = new Set<string>()): number {
    if (depthMap.has(id)) return depthMap.get(id)!;
    if (visited.has(id)) return 0; // cycle guard (validator already caught cycles)

    visited.add(id);
    const parent = parentMap.get(id);
    const depth = parent !== undefined ? getDepth(parent, visited) + 1 : 0;
    depthMap.set(id, depth);
    return depth;
  }

  for (const tech of stackfile.technologies) {
    getDepth(tech.id);
  }

  return depthMap;
}

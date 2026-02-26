import type {
  StackfileV0,
  Technology,
  ValidationError,
  ValidationResult,
} from './types.js';

const ALLOWED_TOP_LEVEL_KEYS = new Set(['version', 'imports', 'technologies']);

/**
 * Validates a parsed (unknown) YAML value against all Stackfile v0 rules.
 *
 * Pure function — no I/O.
 *
 * @param raw - The parsed YAML value (output of `parseStackfile`).
 * @returns `{ ok: true, value }` on success or `{ ok: false, errors }` on failure.
 */
export function validateStackfile(raw: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isRecord(raw)) {
    errors.push({
      code: 'MISSING_VERSION',
      message: '"version" field is required.',
    });
    errors.push({
      code: 'MISSING_TECHNOLOGIES',
      message: '"technologies" field is required and must be an array.',
    });
    return { ok: false, errors };
  }

  // Rule: only allowed top-level keys
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      errors.push({
        code: 'UNKNOWN_TOP_LEVEL_KEY',
        message: `Unknown top-level key: "${key}".`,
        path: key,
      });
    }
  }

  // Rule: version present
  if (!('version' in raw)) {
    errors.push({
      code: 'MISSING_VERSION',
      message: '"version" field is required.',
      path: 'version',
    });
  } else if (raw['version'] !== '0.1') {
    errors.push({
      code: 'UNSUPPORTED_VERSION',
      message: `Unsupported version: "${String(raw['version'])}". Only "0.1" is supported.`,
      path: 'version',
    });
  }

  // Rule: technologies present and is an array
  if (!('technologies' in raw) || raw['technologies'] === undefined) {
    errors.push({
      code: 'MISSING_TECHNOLOGIES',
      message: '"technologies" field is required and must be an array.',
      path: 'technologies',
    });
  } else if (!Array.isArray(raw['technologies'])) {
    errors.push({
      code: 'MISSING_TECHNOLOGIES',
      message: '"technologies" field is required and must be an array.',
      path: 'technologies',
    });
  }

  // If there are already errors in version or technologies, stop early
  // (but still report unknown-key errors)
  const hasFatalErrors = errors.some(
    (e) =>
      e.code === 'MISSING_VERSION' ||
      e.code === 'UNSUPPORTED_VERSION' ||
      e.code === 'MISSING_TECHNOLOGIES',
  );

  if (hasFatalErrors) {
    return { ok: false, errors };
  }

  const technologiesRaw = raw['technologies'] as unknown[];
  const seenIds = new Set<string>();
  const validTechs: Technology[] = [];

  for (let i = 0; i < technologiesRaw.length; i++) {
    const tech = technologiesRaw[i];

    if (!isRecord(tech)) {
      errors.push({
        code: 'MISSING_TECHNOLOGY_ID',
        message: `Technology at index ${i} is not an object.`,
        path: `technologies[${i}]`,
      });
      continue;
    }

    // Rule: technology has an id
    if (!('id' in tech) || typeof tech['id'] !== 'string' || tech['id'].trim() === '') {
      errors.push({
        code: 'MISSING_TECHNOLOGY_ID',
        message: `Technology at index ${i} is missing a non-empty "id" field.`,
        path: `technologies[${i}].id`,
      });
      continue;
    }

    const id = tech['id'];

    // Rule: unique id
    if (seenIds.has(id)) {
      errors.push({
        code: 'DUPLICATE_TECHNOLOGY_ID',
        message: `Duplicate technology id: "${id}".`,
        path: `technologies[${i}].id`,
      });
      continue;
    }
    seenIds.add(id);

    // Rule: detect.include present and non-empty
    if (!('detect' in tech) || !isRecord(tech['detect'])) {
      errors.push({
        code: 'MISSING_DETECT_INCLUDE',
        message: `Technology "${id}" is missing "detect.include".`,
        path: `technologies[${i}].detect`,
      });
      continue;
    }

    const detect = tech['detect'];
    if (!('include' in detect) || !Array.isArray(detect['include'])) {
      errors.push({
        code: 'MISSING_DETECT_INCLUDE',
        message: `Technology "${id}" is missing "detect.include".`,
        path: `technologies[${i}].detect.include`,
      });
      continue;
    }

    const include = detect['include'] as unknown[];
    if (include.length === 0) {
      errors.push({
        code: 'EMPTY_DETECT_INCLUDE',
        message: `Technology "${id}" has an empty "detect.include" array.`,
        path: `technologies[${i}].detect.include`,
      });
      continue;
    }

    const includeStrings = include.filter((p): p is string => typeof p === 'string');

    const parent =
      'parent' in tech && typeof tech['parent'] === 'string' ? tech['parent'] : undefined;

    const tags =
      'tags' in tech && Array.isArray(tech['tags'])
        ? (tech['tags'] as unknown[]).filter((t): t is string => typeof t === 'string')
        : undefined;

    const description =
      'description' in tech && typeof tech['description'] === 'string'
        ? tech['description']
        : undefined;

    validTechs.push({
      id,
      parent,
      detect: { include: includeStrings },
      tags,
      description,
    });
  }

  // If tech-level errors exist, stop before reference checks
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Rule: all parent references must exist
  for (const tech of validTechs) {
    if (tech.parent !== undefined && !seenIds.has(tech.parent)) {
      errors.push({
        code: 'UNKNOWN_PARENT',
        message: `Technology "${tech.id}" references unknown parent "${tech.parent}".`,
        path: `technologies[${validTechs.indexOf(tech)}].parent`,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Rule: hierarchy is acyclic
  const cycleErrors = detectCycles(validTechs);
  if (cycleErrors.length > 0) {
    return { ok: false, errors: cycleErrors };
  }

  // Build the validated result
  const stackfile: StackfileV0 = {
    version: '0.1',
    technologies: validTechs,
    imports: buildImports(raw),
  };

  return { ok: true, value: stackfile };
}

function detectCycles(techs: Technology[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const parentMap = new Map<string, string>();
  for (const tech of techs) {
    if (tech.parent !== undefined) {
      parentMap.set(tech.id, tech.parent);
    }
  }

  const reportedCycles = new Set<string>();

  for (const tech of techs) {
    if (!parentMap.has(tech.id)) continue;

    // Trace the ancestor chain from this technology to find cycles
    const chain: string[] = [];
    const seen = new Set<string>();
    let current: string | undefined = tech.id;

    while (current !== undefined && !seen.has(current)) {
      seen.add(current);
      chain.push(current);
      current = parentMap.get(current);
    }

    if (current !== undefined && chain.includes(current)) {
      // Found a cycle — build canonical key for deduplication across starting points
      const cycleStart = chain.indexOf(current);
      const cycleMembers = chain.slice(cycleStart);
      const cycleKey = [...cycleMembers].sort().join(',');

      if (!reportedCycles.has(cycleKey)) {
        reportedCycles.add(cycleKey);
        errors.push({
          code: 'CYCLIC_INHERITANCE',
          message: `Cyclic inheritance detected among technologies: ${cycleMembers.map((m) => `"${m}"`).join(' → ')}.`,
        });
      }
    }
  }

  return errors;
}

function buildImports(raw: Record<string, unknown>): StackfileV0['imports'] {
  if (!('imports' in raw) || !Array.isArray(raw['imports'])) {
    return undefined;
  }
  return (raw['imports'] as unknown[])
    .filter(isRecord)
    .filter((entry) => typeof entry['source'] === 'string' && typeof entry['version'] === 'string')
    .map((entry) => ({
      source: entry['source'] as string,
      version: entry['version'] as string,
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

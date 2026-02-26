import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCoverage } from './coverage-analyzer.js';
import type { StackfileV0 } from '../stackfile/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStackfile(techs: StackfileV0['technologies']): StackfileV0 {
  return { version: '0.1', technologies: techs };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('analyzeCoverage', () => {
  it('returns uncoveredFiles: [] when all files are covered', () => {
    const stackfile = makeStackfile([
      { id: 'typescript', detect: { include: ['**/*.ts'] } },
    ]);
    const files = ['src/index.ts', 'src/utils.ts'];
    const result = analyzeCoverage(files, stackfile);

    assert.equal(result.totalFiles, 2);
    assert.deepEqual(result.uncoveredFiles, []);
  });

  it('reports one uncovered file when one file does not match any technology', () => {
    const stackfile = makeStackfile([
      { id: 'typescript', detect: { include: ['**/*.ts'] } },
    ]);
    const files = ['src/index.ts', 'README.md'];
    const result = analyzeCoverage(files, stackfile);

    assert.equal(result.totalFiles, 2);
    assert.deepEqual(result.uncoveredFiles, ['README.md']);
  });

  it('reports all files as uncovered when technologies array is empty', () => {
    const stackfile = makeStackfile([]);
    const files = ['src/index.ts', 'README.md', 'package.json'];
    const result = analyzeCoverage(files, stackfile);

    assert.equal(result.totalFiles, 3);
    assert.equal(result.uncoveredFiles.length, 3);
  });

  it('matches nested paths with glob patterns', () => {
    const stackfile = makeStackfile([
      { id: 'typescript', detect: { include: ['**/*.ts'] } },
      { id: 'markdown', detect: { include: ['**/*.md'] } },
    ]);
    const files = [
      'src/cli/main.ts',
      'src/coverage/file-scanner.ts',
      'docs/guide.md',
      'src/utils.js',
    ];
    const result = analyzeCoverage(files, stackfile);

    assert.equal(result.totalFiles, 4);
    assert.deepEqual(result.uncoveredFiles, ['src/utils.js']);
  });

  it('throws an Error when two technologies at the same depth both match the same file', () => {
    // Both 'react' and 'vue' are at depth 0 (no parent), so they conflict
    const stackfile = makeStackfile([
      { id: 'react', detect: { include: ['src/**/*.js'] } },
      { id: 'vue', detect: { include: ['**/*.js'] } },
    ]);
    const files = ['src/App.js'];

    assert.throws(
      () => analyzeCoverage(files, stackfile),
      (err: unknown) => {
        assert.ok(err instanceof Error, 'expected an Error');
        assert.ok(
          (err as Error).message.includes('Classification conflict'),
          `unexpected message: ${(err as Error).message}`,
        );
        return true;
      },
    );
  });

  it('returns totalFiles matching the input file count', () => {
    const stackfile = makeStackfile([
      { id: 'typescript', detect: { include: ['**/*.ts'] } },
    ]);
    const files = ['a.ts', 'b.ts', 'c.md', 'd.js'];
    const result = analyzeCoverage(files, stackfile);
    assert.equal(result.totalFiles, 4);
  });
});

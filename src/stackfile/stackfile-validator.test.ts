import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateStackfile } from './stackfile-validator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validStackfile() {
  return {
    version: '0.1',
    technologies: [
      {
        id: 'typescript',
        detect: { include: ['**/*.ts'] },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Passing test
// ---------------------------------------------------------------------------

describe('validateStackfile', () => {
  it('returns ok:true for a fully valid Stackfile', () => {
    const result = validateStackfile(validStackfile());
    assert.ok(result.ok, 'expected ok:true');
    if (result.ok) {
      assert.equal(result.value.version, '0.1');
      assert.equal(result.value.technologies.length, 1);
    }
  });

  // -------------------------------------------------------------------------
  // One test per ValidationErrorCode
  // -------------------------------------------------------------------------

  it('MISSING_VERSION — missing version field', () => {
    const result = validateStackfile({ technologies: [{ id: 'ts', detect: { include: ['**/*.ts'] } }] });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'MISSING_VERSION'));
    }
  });

  it('UNSUPPORTED_VERSION — version value is not "0.1"', () => {
    const result = validateStackfile({ version: '2.0', technologies: [] });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'UNSUPPORTED_VERSION'));
    }
  });

  it('UNKNOWN_TOP_LEVEL_KEY — unrecognised top-level key', () => {
    const result = validateStackfile({ version: '0.1', technologies: [], config: {} });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'UNKNOWN_TOP_LEVEL_KEY'));
    }
  });

  it('MISSING_TECHNOLOGIES — technologies field absent', () => {
    const result = validateStackfile({ version: '0.1' });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'MISSING_TECHNOLOGIES'));
    }
  });

  it('DUPLICATE_TECHNOLOGY_ID — two technologies share the same id', () => {
    const result = validateStackfile({
      version: '0.1',
      technologies: [
        { id: 'ts', detect: { include: ['**/*.ts'] } },
        { id: 'ts', detect: { include: ['**/*.tsx'] } },
      ],
    });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'DUPLICATE_TECHNOLOGY_ID'));
    }
  });

  it('MISSING_TECHNOLOGY_ID — technology without an id field', () => {
    const result = validateStackfile({
      version: '0.1',
      technologies: [{ detect: { include: ['**/*.ts'] } }],
    });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'MISSING_TECHNOLOGY_ID'));
    }
  });

  it('MISSING_DETECT_INCLUDE — technology without detect.include', () => {
    const result = validateStackfile({
      version: '0.1',
      technologies: [{ id: 'ts' }],
    });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'MISSING_DETECT_INCLUDE'));
    }
  });

  it('EMPTY_DETECT_INCLUDE — detect.include is an empty array', () => {
    const result = validateStackfile({
      version: '0.1',
      technologies: [{ id: 'ts', detect: { include: [] } }],
    });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'EMPTY_DETECT_INCLUDE'));
    }
  });

  it('UNKNOWN_PARENT — parent references an id that does not exist', () => {
    const result = validateStackfile({
      version: '0.1',
      technologies: [
        { id: 'typescript-test', parent: 'typescript', detect: { include: ['**/*.test.ts'] } },
      ],
    });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'UNKNOWN_PARENT'));
    }
  });

  it('CYCLIC_INHERITANCE — direct two-node cycle (A → B → A)', () => {
    const result = validateStackfile({
      version: '0.1',
      technologies: [
        { id: 'A', parent: 'B', detect: { include: ['**/*.a'] } },
        { id: 'B', parent: 'A', detect: { include: ['**/*.b'] } },
      ],
    });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'CYCLIC_INHERITANCE'));
    }
  });

  it('CYCLIC_INHERITANCE — multi-hop cycle (A → B → C → A)', () => {
    const result = validateStackfile({
      version: '0.1',
      technologies: [
        { id: 'A', parent: 'C', detect: { include: ['**/*.a'] } },
        { id: 'B', parent: 'A', detect: { include: ['**/*.b'] } },
        { id: 'C', parent: 'B', detect: { include: ['**/*.c'] } },
      ],
    });
    assert.ok(!result.ok);
    if (!result.ok) {
      assert.ok(result.errors.some((e) => e.code === 'CYCLIC_INHERITANCE'));
    }
  });
});

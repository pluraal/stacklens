import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseStackfile } from './stackfile-parser.js';
import { StackfileParseError } from './types.js';

describe('parseStackfile', () => {
  it('returns an unknown object with expected keys for valid YAML', () => {
    const raw = 'version: "0.1"\ntechnologies: []\n';
    const result = parseStackfile(raw);

    assert.ok(typeof result === 'object' && result !== null, 'expected an object');
    const obj = result as Record<string, unknown>;
    assert.equal(obj['version'], '0.1');
    assert.deepEqual(obj['technologies'], []);
  });

  it('throws StackfileParseError whose message starts with "Invalid YAML:" on syntax error', () => {
    const invalidYaml = 'version: :\n  bad: [\n';

    assert.throws(
      () => parseStackfile(invalidYaml),
      (err: unknown) => {
        assert.ok(err instanceof StackfileParseError, `expected StackfileParseError, got ${String(err)}`);
        assert.ok(
          (err as Error).message.startsWith('Invalid YAML:'),
          `unexpected message: ${(err as Error).message}`,
        );
        return true;
      },
    );
  });

  it('returns null or undefined for empty string input', () => {
    // yaml.parse('') returns null in yaml v2
    const result = parseStackfile('');
    // Document: empty string parses to null in yaml v2
    assert.ok(result === null || result === undefined, `expected null or undefined, got ${String(result)}`);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadStackfile } from './stackfile-loader.js';
import { StackfileNotFoundError, StackfileIOError } from './types.js';

describe('loadStackfile', () => {
  it('returns raw YAML string when the file exists', async () => {
    const dir = await mkTempDir();
    const filePath = join(dir, '.stack');
    const content = 'version: "0.1"\ntechnologies: []\n';
    await writeFile(filePath, content, 'utf8');

    const result = await loadStackfile(filePath);
    assert.equal(result, content);

    await rm(dir, { recursive: true, force: true });
  });

  it('throws StackfileNotFoundError when the file does not exist', async () => {
    const filePath = '/tmp/stacklens-nonexistent-fixture/.stack';

    await assert.rejects(
      () => loadStackfile(filePath),
      (err: unknown) => {
        assert.ok(err instanceof StackfileNotFoundError, 'expected StackfileNotFoundError');
        assert.ok(
          (err as Error).message.includes(filePath),
          `message should contain the searched path: ${(err as Error).message}`,
        );
        return true;
      },
    );
  });

  it('throws StackfileIOError when the file cannot be read', async () => {
    // Create a directory at the path (not a file) to trigger EISDIR
    const dir = await mkTempDir();
    const notAFile = join(dir, 'subdir');
    await mkdir(notAFile);

    await assert.rejects(
      () => loadStackfile(notAFile),
      (err: unknown) => {
        assert.ok(err instanceof StackfileIOError, `expected StackfileIOError, got ${String(err)}`);
        assert.ok(
          (err as Error).message.startsWith('Failed to read Stackfile at:'),
          `unexpected message: ${(err as Error).message}`,
        );
        return true;
      },
    );

    await rm(dir, { recursive: true, force: true });
  });
});

async function mkTempDir(): Promise<string> {
  const dir = join(tmpdir(), `stacklens-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

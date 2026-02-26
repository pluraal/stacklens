import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { scanFiles } from './file-scanner.js';

const fixturesDir = fileURLToPath(
  new URL('../../specs/001-minimal-cli/fixtures', import.meta.url),
);

describe('scanFiles', () => {
  it('returns relative paths for a fixture directory with files', async () => {
    const dir = join(fixturesDir, 'valid-with-uncovered');
    const files = await scanFiles(dir);

    // Should find at least the .stack file and uncovered.xyz
    assert.ok(files.length >= 2, `expected at least 2 files, got ${files.length}: ${files.join(', ')}`);

    // All paths should use forward slashes and not start with ./
    for (const f of files) {
      assert.ok(!f.startsWith('./'), `path should not start with ./: ${f}`);
      assert.ok(!f.includes('\\'), `path should use forward slashes: ${f}`);
    }

    assert.ok(files.includes('uncovered.xyz'), `expected uncovered.xyz in results: ${files.join(', ')}`);
    assert.ok(files.includes('.stack'), `expected .stack in results: ${files.join(', ')}`);
  });

  it('excludes .git/ directory contents', async () => {
    const dir = await mkTempDir();
    // Create a fake .git directory with a file
    await mkdir(join(dir, '.git'), { recursive: true });
    await writeFile(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    await writeFile(join(dir, 'real-file.txt'), 'hello\n');

    const files = await scanFiles(dir);
    assert.ok(files.includes('real-file.txt'), 'should include real-file.txt');
    assert.ok(!files.some((f) => f.includes('.git')), `.git should be excluded: ${files.join(', ')}`);

    await rm(dir, { recursive: true, force: true });
  });

  it('returns paths relative to the provided repoRoot', async () => {
    const dir = join(fixturesDir, 'valid-with-uncovered');
    const files = await scanFiles(dir);

    for (const f of files) {
      assert.ok(!f.startsWith('/'), `path should be relative, not absolute: ${f}`);
    }
  });

  it('returns an empty array for a directory with no files', async () => {
    const dir = await mkTempDir();
    const files = await scanFiles(dir);
    assert.equal(files.length, 0);
    await rm(dir, { recursive: true, force: true });
  });
});

async function mkTempDir(): Promise<string> {
  const { tmpdir } = await import('node:os');
  const dir = join(tmpdir(), `stacklens-scanner-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runStatus } from './status-command.js';
import {
  StackfileNotFoundError,
  StackfileIOError,
  StackfileParseError,
} from '../../../stackfile/types.js';
import type { StackfileV0, ValidationResult } from '../../../stackfile/types.js';
import type { CoverageResult, RelativeFilePath } from '../../../coverage/types.js';

// ---------------------------------------------------------------------------
// Capture helper
// ---------------------------------------------------------------------------

class ExitError extends Error {
  constructor(public readonly code: number) {
    super(`process.exit(${code})`);
    this.name = 'ExitError';
  }
}

interface CapturedOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

async function withCapturedOutput(fn: () => Promise<void>): Promise<CapturedOutput> {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  let capturedExitCode: number | null = null;

  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);
  const origExit = process.exit.bind(process);

  function restore(): void {
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
    process.exit = origExit;
  }

  process.stdout.write = ((chunk: unknown) => {
    stdoutChunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: unknown) => {
    stderrChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  process.exit = ((code?: number | string | null) => {
    capturedExitCode = Number(code ?? 0);
    restore();
    throw new ExitError(capturedExitCode);
  }) as typeof process.exit;

  try {
    await fn();
    restore();
  } catch (err) {
    if (!(err instanceof ExitError)) {
      restore();
      throw err;
    }
    // ExitError is expected — already restored in the exit override
  }

  return {
    stdout: stdoutChunks.join(''),
    stderr: stderrChunks.join(''),
    exitCode: capturedExitCode,
  };
}

// ---------------------------------------------------------------------------
// Stub factories
// ---------------------------------------------------------------------------

function stubLoader(content: string) {
  return async (_filePath: string): Promise<string> => content;
}

function stubParser(value: unknown) {
  return (_raw: string): unknown => value;
}

function stubValidator(result: ValidationResult) {
  return (_raw: unknown): ValidationResult => result;
}

function stubScanner(files: RelativeFilePath[]) {
  return async (_repoRoot: string): Promise<readonly RelativeFilePath[]> => files;
}

function stubAnalyzer(result: CoverageResult) {
  return (_files: readonly RelativeFilePath[], _stackfile: StackfileV0): CoverageResult => result;
}

const validStackfile: StackfileV0 = {
  version: '0.1',
  technologies: [{ id: 'ts', detect: { include: ['**/*.ts'] } }],
};

// ---------------------------------------------------------------------------
// US1: Valid Stackfile scenarios
// ---------------------------------------------------------------------------

describe('status-command (US1)', () => {
  it('exits 0 and writes success message when all files are covered', async () => {
    const out = await withCapturedOutput(() =>
      runStatus(
        '/fake/cwd',
        stubLoader(''),
        stubParser({}),
        stubValidator({ ok: true, value: validStackfile }),
        stubScanner([]),
        stubAnalyzer({ totalFiles: 0, uncoveredFiles: [] }),
      ),
    );

    assert.ok(out.stdout.includes('✓ Stackfile valid. All files are covered.'));
    assert.equal(out.exitCode, null); // no process.exit called → successful return
  });

  it('exits 1 and lists uncovered files (sorted) on stdout + count on stderr', async () => {
    const out = await withCapturedOutput(() =>
      runStatus(
        '/fake/cwd',
        stubLoader(''),
        stubParser({}),
        stubValidator({ ok: true, value: validStackfile }),
        stubScanner(['z.md', 'a.md', 'b.md']),
        stubAnalyzer({ totalFiles: 3, uncoveredFiles: ['z.md', 'a.md', 'b.md'] }),
      ),
    );

    assert.equal(out.exitCode, 1);
    const lines = out.stdout.trim().split('\n');
    assert.deepEqual(lines, ['a.md', 'b.md', 'z.md']);
    assert.ok(out.stderr.includes('3 uncovered file(s) found.'));
  });

  it('exits 1 and reports all files uncovered when technologies is empty', async () => {
    const emptyStackfile: StackfileV0 = { version: '0.1', technologies: [] };
    const out = await withCapturedOutput(() =>
      runStatus(
        '/fake/cwd',
        stubLoader(''),
        stubParser({}),
        stubValidator({ ok: true, value: emptyStackfile }),
        stubScanner(['file1.ts', 'file2.ts']),
        stubAnalyzer({ totalFiles: 2, uncoveredFiles: ['file1.ts', 'file2.ts'] }),
      ),
    );

    assert.equal(out.exitCode, 1);
    assert.ok(out.stdout.includes('file1.ts'));
    assert.ok(out.stdout.includes('file2.ts'));
  });
});

// ---------------------------------------------------------------------------
// US2: Validation-failure and I/O-failure paths
// ---------------------------------------------------------------------------

describe('status-command (US2)', () => {
  it('exits 1 and prints [MISSING_VERSION] on stderr for missing-version Stackfile', async () => {
    const out = await withCapturedOutput(() =>
      runStatus(
        '/fake/cwd',
        stubLoader(''),
        stubParser({}),
        stubValidator({
          ok: false,
          errors: [{ code: 'MISSING_VERSION', message: '"version" field is required.' }],
        }),
        stubScanner([]),
        stubAnalyzer({ totalFiles: 0, uncoveredFiles: [] }),
      ),
    );

    assert.equal(out.exitCode, 1);
    assert.ok(out.stderr.includes('[MISSING_VERSION]'), `stderr: ${out.stderr}`);
  });

  it('exits 1 and prints [UNKNOWN_TOP_LEVEL_KEY] on stderr for unknown-key Stackfile', async () => {
    const out = await withCapturedOutput(() =>
      runStatus(
        '/fake/cwd',
        stubLoader(''),
        stubParser({}),
        stubValidator({
          ok: false,
          errors: [{ code: 'UNKNOWN_TOP_LEVEL_KEY', message: 'Unknown top-level key: "config".' }],
        }),
        stubScanner([]),
        stubAnalyzer({ totalFiles: 0, uncoveredFiles: [] }),
      ),
    );

    assert.equal(out.exitCode, 1);
    assert.ok(out.stderr.includes('[UNKNOWN_TOP_LEVEL_KEY]'), `stderr: ${out.stderr}`);
  });

  it('exits 1 and prints [CYCLIC_INHERITANCE] on stderr for cyclic Stackfile', async () => {
    const out = await withCapturedOutput(() =>
      runStatus(
        '/fake/cwd',
        stubLoader(''),
        stubParser({}),
        stubValidator({
          ok: false,
          errors: [{ code: 'CYCLIC_INHERITANCE', message: 'Cyclic inheritance detected.' }],
        }),
        stubScanner([]),
        stubAnalyzer({ totalFiles: 0, uncoveredFiles: [] }),
      ),
    );

    assert.equal(out.exitCode, 1);
    assert.ok(out.stderr.includes('[CYCLIC_INHERITANCE]'), `stderr: ${out.stderr}`);
  });

  it('exits 1 and prints "Stackfile not found at:" when loader throws StackfileNotFoundError', async () => {
    const out = await withCapturedOutput(() =>
      runStatus(
        '/fake/cwd',
        async (_filePath: string): Promise<string> => {
          throw new StackfileNotFoundError('/fake/cwd/.stack');
        },
        stubParser({}),
        stubValidator({ ok: true, value: validStackfile }),
        stubScanner([]),
        stubAnalyzer({ totalFiles: 0, uncoveredFiles: [] }),
      ),
    );

    assert.equal(out.exitCode, 1);
    assert.ok(out.stderr.includes('Stackfile not found at:'), `stderr: ${out.stderr}`);
  });

  it('exits 1 and prints "Invalid YAML:" when parser throws StackfileParseError', async () => {
    const out = await withCapturedOutput(() =>
      runStatus(
        '/fake/cwd',
        stubLoader(''),
        (_raw: string): unknown => {
          throw new StackfileParseError('unexpected token');
        },
        stubValidator({ ok: true, value: validStackfile }),
        stubScanner([]),
        stubAnalyzer({ totalFiles: 0, uncoveredFiles: [] }),
      ),
    );

    assert.equal(out.exitCode, 1);
    assert.ok(out.stderr.includes('Invalid YAML:'), `stderr: ${out.stderr}`);
  });

  it('exits 1 and prints "Failed to read Stackfile at:" when loader throws StackfileIOError', async () => {
    const out = await withCapturedOutput(() =>
      runStatus(
        '/fake/cwd',
        async (_filePath: string): Promise<string> => {
          throw new StackfileIOError('/fake/cwd/.stack', new Error('EPERM'));
        },
        stubParser({}),
        stubValidator({ ok: true, value: validStackfile }),
        stubScanner([]),
        stubAnalyzer({ totalFiles: 0, uncoveredFiles: [] }),
      ),
    );

    assert.equal(out.exitCode, 1);
    assert.ok(out.stderr.includes('Failed to read Stackfile at:'), `stderr: ${out.stderr}`);
  });
});

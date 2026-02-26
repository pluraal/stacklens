import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

// Path to the compiled main.js entry point
const mainJs = fileURLToPath(new URL('./main.js', import.meta.url));

async function runCli(
  args: string[],
  cwd?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [mainJs, ...args], {
      cwd: cwd ?? process.cwd(),
      env: { ...process.env },
    });
    return { exitCode: 0, stdout, stderr };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { stdout?: string; stderr?: string; code?: number };
    return {
      exitCode: typeof e.code === 'number' ? e.code : 1,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
    };
  }
}

// ---------------------------------------------------------------------------
// US3: --help and no-args
// ---------------------------------------------------------------------------

describe('program (US3)', () => {
  it('stacklens --help exits 0 and shows expected content', async () => {
    const { exitCode, stdout } = await runCli(['--help']);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('stacklens'), `expected "stacklens" in stdout: ${stdout}`);
    assert.ok(stdout.includes('status'), `expected "status" in stdout: ${stdout}`);
    assert.ok(stdout.includes('-V, --version'), `expected "-V, --version" in stdout: ${stdout}`);
    assert.ok(stdout.includes('-h, --help'), `expected "-h, --help" in stdout: ${stdout}`);
  });

  it('stacklens status --help exits 0 and shows status description', async () => {
    const { exitCode, stdout } = await runCli(['status', '--help']);
    assert.equal(exitCode, 0);
    assert.ok(
      stdout.includes('Validate the Stackfile and report uncovered files'),
      `expected description in stdout: ${stdout}`,
    );
    assert.ok(stdout.includes('-h, --help'), `expected "-h, --help" in stdout: ${stdout}`);
  });

  it('bare stacklens (no args) exits 0 and prints top-level help', async () => {
    const { exitCode, stdout } = await runCli([]);
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes('stacklens'), `expected "stacklens" in stdout: ${stdout}`);
    assert.ok(stdout.includes('status'), `expected "status" command in stdout: ${stdout}`);
  });
});

// ---------------------------------------------------------------------------
// US4: Unknown command
// ---------------------------------------------------------------------------

describe('program (US4)', () => {
  it('stacklens unknowncmd exits 1 and stderr contains unknown command message', async () => {
    const { exitCode, stderr } = await runCli(['unknowncmd']);
    assert.equal(exitCode, 1);
    assert.ok(
      stderr.includes("unknown command 'unknowncmd'"),
      `expected unknown command message in stderr: ${stderr}`,
    );
  });
});

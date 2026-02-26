import type { Command } from 'commander';
import { loadStackfile } from '../../../stackfile/stackfile-loader.js';
import { parseStackfile } from '../../../stackfile/stackfile-parser.js';
import { validateStackfile } from '../../../stackfile/stackfile-validator.js';
import { scanFiles } from '../../../coverage/file-scanner.js';
import { analyzeCoverage } from '../../../coverage/coverage-analyzer.js';
import {
  StackfileNotFoundError,
  StackfileIOError,
  StackfileParseError,
} from '../../../stackfile/types.js';
import type { StackfileV0, ValidationResult } from '../../../stackfile/types.js';
import type { CoverageResult, RelativeFilePath } from '../../../coverage/types.js';
import { join } from 'node:path';

/** Injectable dependency type for the file loader. */
export type LoaderFn = (filePath: string) => Promise<string>;
/** Injectable dependency type for the YAML parser. */
export type ParserFn = (raw: string) => unknown;
/** Injectable dependency type for the Stackfile validator. */
export type ValidatorFn = (raw: unknown) => ValidationResult;
/** Injectable dependency type for the file scanner. */
export type ScannerFn = (repoRoot: string) => Promise<readonly RelativeFilePath[]>;
/** Injectable dependency type for the coverage analyzer. */
export type AnalyzerFn = (files: readonly RelativeFilePath[], stackfile: StackfileV0) => CoverageResult;

/**
 * Registers the `status` subcommand on the given Commander program.
 *
 * @param program - The root Commander Command instance.
 */
export function register(program: Command): void {
  program
    .command('status')
    .description('Validate the Stackfile and report uncovered files')
    .action(async () => {
      await runStatus(process.cwd());
    });
}

/**
 * Runs the full status pipeline.
 *
 * Exported for testability with injectable dependencies.
 */
export async function runStatus(
  cwd: string,
  loader: LoaderFn = loadStackfile,
  parser: ParserFn = parseStackfile,
  validator: ValidatorFn = validateStackfile,
  scanner: ScannerFn = scanFiles,
  analyzer: AnalyzerFn = analyzeCoverage,
): Promise<void> {
  const stackfilePath = join(cwd, '.stack');

  // Load
  const raw = await loader(stackfilePath).catch((err: unknown) => {
    if (err instanceof StackfileNotFoundError) {
      process.stderr.write(err.message + '\n');
    } else if (err instanceof StackfileIOError) {
      process.stderr.write(err.message + '\n');
    } else {
      process.stderr.write(`Failed to read Stackfile at: ${stackfilePath}\n`);
    }
    process.exit(1);
    return '' as never;
  });

  // Parse
  const parsed = await Promise.resolve()
    .then(() => parser(raw))
    .catch((err: unknown) => {
      if (err instanceof StackfileParseError) {
        process.stderr.write(err.message + '\n');
      } else {
        process.stderr.write(`Invalid YAML: ${String(err)}\n`);
      }
      process.exit(1);
      return undefined as never;
    });

  // Validate
  const result = validator(parsed);
  if (!result.ok) {
    process.stderr.write('Stackfile validation failed:\n');
    for (const error of result.errors) {
      process.stderr.write(`  [${error.code}] ${error.message}\n`);
    }
    process.exit(1);
    return;
  }

  const stackfile = result.value;

  // Scan
  const files = await scanner(cwd);

  // Analyze
  const coverage = await Promise.resolve()
    .then(() => analyzer(files, stackfile))
    .catch((err: unknown) => {
      process.stderr.write(String(err instanceof Error ? err.message : err) + '\n');
      process.exit(1);
      return undefined as never;
    });

  // Report
  if (coverage.uncoveredFiles.length === 0) {
    process.stdout.write('✓ Stackfile valid. All files are covered.\n');
    return;
  }

  const sorted = [...coverage.uncoveredFiles].sort();
  for (const file of sorted) {
    process.stdout.write(file + '\n');
  }
  process.stderr.write(`${coverage.uncoveredFiles.length} uncovered file(s) found.\n`);
  process.exit(1);
}

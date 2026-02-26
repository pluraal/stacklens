import { readFileSync } from 'node:fs';
import { Command } from 'commander';

const pkgText = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
const pkg = JSON.parse(pkgText) as { version: string };

/**
 * Creates and returns the configured Commander program instance.
 *
 * @returns A Commander `Command` pre-configured with name, description, version, and help settings.
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('stacklens')
    .description('Semantic technology stack projection toolkit')
    .version(pkg.version, '-V, --version')
    .addHelpCommand(false)
    .showHelpAfterError(false);

  return program;
}

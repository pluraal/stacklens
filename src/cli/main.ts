#!/usr/bin/env node
import { createProgram } from './program.js';
import { register } from './commands/status/status-command.js';

const program = createProgram();
register(program);

// Handle no-args: print help and exit 0
if (process.argv.length <= 2) {
  program.help();
}

await program.parseAsync(process.argv);

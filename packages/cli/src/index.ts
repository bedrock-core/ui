#!/usr/bin/env node

import { createRequire } from 'node:module';
import { Command } from 'commander';
import { createProject } from './generator.js';
import chalk from 'chalk';

// `../package.json` is outside `rootDir`, so it cannot be imported: that would
// pull it into the emit and nest `dist/` a level deeper. Read it at runtime
// instead — from `dist/index.js` the path resolves to the published manifest.
const manifest: unknown = createRequire(import.meta.url)('../package.json');
const version
  = typeof manifest === 'object' && manifest !== null && 'version' in manifest && typeof manifest.version === 'string'
    ? manifest.version
    : '0.0.0';

const program = new Command();

interface CliOptions {
  author?: string;
  description?: string;
}

program
  .name('@bedrock-core/cli')
  .description('CLI to scaffold Minecraft Bedrock addon projects with @bedrock-core/ui')
  .version(version)
  .argument('[project-name]', 'Name of the project directory')
  .option('-a, --author <name>', 'Author name (skips the prompt; enables non-interactive use)')
  .option('-d, --description <text>', 'Project description (skips the prompt; enables non-interactive use)')
  .action(async (projectName: string | undefined, options: CliOptions) => {
    try {
      await createProject(projectName, options.author, options.description);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();

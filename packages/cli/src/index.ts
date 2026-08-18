#!/usr/bin/env node

import { Command } from 'commander';
import { createProject } from './generator.js';
import chalk from 'chalk';

const program = new Command();

interface CliOptions {
  author?: string;
  description?: string;
}

program
  .name('@bedrock-core/cli')
  .description('CLI to scaffold Minecraft Bedrock addon projects with @bedrock-core/ui')
  .version('0.1.1')
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

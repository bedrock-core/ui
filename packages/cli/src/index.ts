#!/usr/bin/env node

import { Command } from 'commander';
import { createProject } from './generator.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('@bedrock-core/cli')
  .description('CLI to scaffold Minecraft Bedrock addon projects with @bedrock-core/ui')
  .version('0.1.1')
  .argument('[project-name]', 'Name of the project directory')
  .action(async(projectName?: string) => {
    try {
      await createProject(projectName);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();

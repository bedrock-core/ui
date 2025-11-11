import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import { promptUser, type ProjectConfig } from './prompts.js';
import { generateManifestUUIDs, replaceVariables } from './utils.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Get the template directory path
 */
function getTemplateDir(): string {
  // When built, templates should be at the same level as dist/
  return path.resolve(dirname, '../templates/default');
}

/**
 * Check if directory is empty or doesn't exist
 */
async function isDirectoryEmpty(dir: string): Promise<boolean> {
  try {
    const files = await fs.readdir(dir);

    return files.length === 0;
  } catch {
    return true; // Directory doesn't exist
  }
}

/**
 * Process a file and replace template variables
 */
async function processFile(
  sourcePath: string,
  targetPath: string,
  variables: Record<string, string>,
): Promise<void> {
  const content = await fs.readFile(sourcePath, 'utf-8');
  const processed = replaceVariables(content, variables);

  await fs.writeFile(targetPath, processed, 'utf-8');
}

/**
 * Copy template directory and process files
 */
async function copyTemplate(
  templateDir: string,
  targetDir: string,
  variables: Record<string, string>,
  spinner: Ora,
): Promise<void> {
  const filesToProcess = [
    'config.json',
    'package.json',
    'tsconfig.json',
    'eslint.config.mjs',
    'README.md',
    '.vscode/launch.json',
    'packs/BP/manifest.json',
    'packs/BP/texts/en_US.lang',
    'packs/BP/scripts/main.ts',
    'packs/BP/scripts/UI/Example.tsx',
    'packs/RP/manifest.json',
    'packs/RP/texts/en_US.lang',
  ];

  spinner.text = 'Copying template files...';

  // First, copy the entire template structure
  await fs.copy(templateDir, targetDir, {
    filter: src => {
      // Skip node_modules and build artifacts if they exist in template
      const relativePath = path.relative(templateDir, src);

      return !relativePath.includes('node_modules') && !relativePath.includes('build');
    },
  });

  spinner.text = 'Processing template variables...';

  // Then process files that need variable replacement
  for (const file of filesToProcess) {
    const sourcePath = path.join(templateDir, file);
    const targetPath = path.join(targetDir, file);

    if (await fs.pathExists(sourcePath)) {
      await processFile(sourcePath, targetPath, variables);
    }
  }
}

/**
 * Display success message with next steps
 */
function displayNextSteps(config: ProjectConfig): void {
  console.log('\n' + chalk.green('✔ Project created successfully!'));
  console.log('\n' + chalk.bold('Next steps:') + '\n');
  console.log(chalk.cyan(`  cd ${config.projectName}`));
  console.log(chalk.cyan('  yarn install') + chalk.gray(' (or npm install)'));
  console.log(chalk.cyan('  yarn run regolith-install') + chalk.gray(' (or npm run regolith-install)'));
  console.log(chalk.cyan('  yarn run build') + chalk.gray(' (or npm run build)'));
  console.log('\n' + chalk.bold('Development:') + '\n');
  console.log(chalk.cyan('  yarn run watch') + chalk.gray(' - Watch mode for auto-rebuild'));
  console.log(chalk.cyan('  yarn run lint') + chalk.gray(' - Lint your code'));
  console.log('\n' + chalk.gray('Push a stone button in-game to see the example UI!'));
  console.log();
}

/**
 * Main function to create a new project
 */
export async function createProject(initialProjectName?: string): Promise<void> {
  console.log(chalk.bold.cyan('\n@bedrock-core/ui') + chalk.gray(' - Project Generator\n'));

  // Get user input
  const config = await promptUser(initialProjectName);

  // Check if target directory exists and is not empty
  const isEmpty = await isDirectoryEmpty(config.targetDir);
  if (!isEmpty) {
    throw new Error(
      `Directory "${config.projectName}" already exists and is not empty. Please choose a different name.`,
    );
  }

  // Generate UUIDs for manifests
  const uuids = generateManifestUUIDs();

  // Prepare template variables
  const variables = {
    PROJECT_NAME: config.projectName,
    AUTHOR: config.author,
    DESCRIPTION: config.description,
    ...uuids,
  };

  const spinner = ora('Creating project...').start();

  try {
    // Get template directory
    const templateDir = getTemplateDir();

    if (!await fs.pathExists(templateDir)) {
      throw new Error(`Template directory not found at: ${templateDir}`);
    }

    // Create target directory
    await fs.ensureDir(config.targetDir);

    // Copy and process template
    await copyTemplate(templateDir, config.targetDir, variables, spinner);

    spinner.succeed('Project created!');

    // Display next steps
    displayNextSteps(config);
  } catch (error) {
    spinner.fail('Failed to create project');

    throw error;
  }
}

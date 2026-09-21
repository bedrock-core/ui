import prompts from 'prompts';
import chalk from 'chalk';
import path from 'node:path';
import validateNpmPackageName from 'validate-npm-package-name';

export type PackageManager = 'yarn' | 'npm' | 'pnpm' | 'none';

export interface ProjectConfig {
  projectName: string;
  author: string;
  description: string;
  packageManager: PackageManager;
  targetDir: string;
}

export function projectNameError(value: string): string | undefined {
  const validation = validateNpmPackageName(value);

  if (!validation.validForNewPackages) {
    const errors = [...validation.errors || [], ...validation.warnings || []];

    return errors[0] || 'Invalid package name';
  }

  return undefined;
}

export async function promptUser(
  initialProjectName?: string,
  initialAuthor?: string,
  initialDescription?: string,
  initialPackageManager?: PackageManager,
): Promise<ProjectConfig> {
  const questions: prompts.PromptObject[] = [];

  // Project name
  if (!initialProjectName) {
    questions.push({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-addon',
      validate: (value: string) => projectNameError(value) ?? true,
    });
  }

  // Author
  if (!initialAuthor) {
    questions.push({
      type: 'text',
      name: 'author',
      message: 'Author name:',
      initial: 'Your Name',
    });
  }

  // Description
  if (!initialDescription) {
    questions.push({
      type: 'text',
      name: 'description',
      message: 'Description:',
      initial: 'A Minecraft Bedrock addon with custom UI',
    });
  }

  if (!initialPackageManager) {
    questions.push({
      type: 'select',
      name: 'packageManager',
      message: 'Install dependencies with:',
      choices: [
        { title: 'yarn (recommended)', value: 'yarn', description: 'Sets yarn as the default package manager' },
        { title: 'npm', value: 'npm', description: 'Sets npm as the default package manager' },
        { title: 'pnpm', value: 'pnpm', description: 'Sets pnpm as the default package manager' },
        { title: 'Other / install later', value: 'none', description: 'Create files without running a package manager' },
      ],
      initial: 0,
    });
  }

  const response = questions.length === 0
    ? {}
    : await prompts(questions, {
        onCancel: () => {
          console.warn(chalk.yellow('\n✖ Operation cancelled'));
          process.exit(0);
        },
      });

  const projectName = initialProjectName || response.projectName;
  const nameError = projectNameError(projectName);

  if (nameError) {
    throw new Error(`Invalid project name "${projectName}": ${nameError}`);
  }

  const targetDir = path.resolve(process.cwd(), projectName);

  return {
    projectName,
    author: initialAuthor || response.author,
    description: initialDescription || response.description,
    packageManager: initialPackageManager || response.packageManager,
    targetDir,
  };
}

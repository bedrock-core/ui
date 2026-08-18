import prompts from 'prompts';
import chalk from 'chalk';
import path from 'node:path';
import validateNpmPackageName from 'validate-npm-package-name';

export interface ProjectConfig {
  projectName: string;
  author: string;
  description: string;
  targetDir: string;
}

export async function promptUser(
  initialProjectName?: string,
  initialAuthor?: string,
  initialDescription?: string,
): Promise<ProjectConfig> {
  const questions: prompts.PromptObject[] = [];

  // Project name
  if (!initialProjectName) {
    questions.push({
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-addon',
      validate: (value: string) => {
        const validation = validateNpmPackageName(value);

        if (!validation.validForNewPackages) {
          const errors = [...validation.errors || [], ...validation.warnings || []];

          return errors[0] || 'Invalid package name';
        }

        return true;
      },
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

  const response = questions.length === 0
    ? {}
    : await prompts(questions, {
        onCancel: () => {
          console.warn(chalk.yellow('\n✖ Operation cancelled'));
          process.exit(0);
        },
      });

  const projectName = initialProjectName || response.projectName;
  const targetDir = path.resolve(process.cwd(), projectName);

  return {
    projectName,
    author: initialAuthor || response.author,
    description: initialDescription || response.description,
    targetDir,
  };
}

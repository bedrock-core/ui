import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';
import { promptUser, type PackageManager, type ProjectConfig } from './prompts.js';
import { generateManifestUUIDs, replaceVariables } from './utils.js';
import https from 'node:https';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Sanitize free-form input (author, project name) into a Minecraft-safe
 * identifier segment: lowercase alphanumerics joined by underscores.
 */
function toIdentifier(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'addon';
}

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Get the template directory path.
 */
function getTemplateDir(): string {
  return path.resolve(dirname, '../templates/bedrock-core');
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
  const isJson = sourcePath.endsWith('.json');
  const isI18nTypeScript = sourcePath.endsWith(path.join('packs', 'data', 'i18n', 'en_US.ts'));
  const processed = replaceVariables(content, variables, (_key, value) => {
    if (isJson) {
      // The placeholder is already inside a JSON string literal.
      return JSON.stringify(value).slice(1, -1);
    }

    if (isI18nTypeScript) {
      // The metadata template uses single-quoted TypeScript strings.
      return value
        .replaceAll('\\', '\\\\')
        .replaceAll(String.fromCharCode(39), '\\' + String.fromCharCode(39))
        .replaceAll('\r', '\\r')
        .replaceAll('\n', '\\n')
        .replaceAll('\u2028', '\\u2028')
        .replaceAll('\u2029', '\\u2029');
    }

    return value;
  });

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
  packageManager: PackageManager,
): Promise<void> {
  const filesToProcess = [
    'config.json',
    'package.json',
    'tsconfig.json',
    'eslint.config.mjs',
    'README.md',
    '.vscode/launch.json',
    'packs/BP/manifest.json',
    'packs/BP/manifest.test.json',
    'packs/BP/texts/en_US.lang',
    'packs/BP/scripts/main.ts',
    'packs/BP/scripts/UI/screens/home.screen.tsx',
    'packs/BP/scripts/UI/screens/plan.screen.tsx',
    'packs/BP/scripts/UI/screens/profile_form.screen.tsx',
    'packs/BP/blocks/tutorial.block.ts',
    'packs/BP/entities/training_dummy.entity.ts',
    'packs/RP/manifest.json',
    'packs/RP/texts/en_US.lang',
    'packs/data/i18n/en_US.ts',
  ];

  spinner.text = 'Copying template files...';

  // First, copy the entire template structure
  await fs.copy(templateDir, targetDir, {
    filter: (src) => {
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

  // npm strips dot-files from published tarballs, so pack-safe names are
  // restored when a project is generated.
  for (const [packedName, actualName] of [['gitignore', '.gitignore'], ['yarnrc.yml', '.yarnrc.yml']]) {
    const packedPath = path.join(targetDir, packedName);

    if (await fs.pathExists(packedPath)) {
      await fs.move(packedPath, path.join(targetDir, actualName), { overwrite: true });
    }
  }

  await configurePackageManager(packageManager, targetDir);
}

export async function configurePackageManager(packageManager: PackageManager, targetDir: string): Promise<void> {
  if (packageManager === 'yarn') {
    return;
  }

  const manifestPath = path.join(targetDir, 'package.json');
  const manifest: unknown = await fs.readJson(manifestPath);

  if (!isRecord(manifest)) {
    throw new Error(`Generated package manifest is invalid: ${manifestPath}`);
  }

  delete manifest.packageManager;
  await fs.writeJson(manifestPath, manifest, { spaces: '\t' });

  if (packageManager !== 'none') {
    await fs.remove(path.join(targetDir, '.yarnrc.yml'));
  }

  if (packageManager === 'pnpm') {
    await fs.writeFile(path.join(targetDir, 'pnpm-workspace.yaml'), 'nodeLinker: hoisted\n');
  }
}

type CommandRunner = (command: string, args: string[], cwd: string) => Promise<void>;

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.once('error', reject);
    child.once('exit', code => code === 0
      ? resolve()
      : reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}`)));
  });
}

export async function installDependencies(
  packageManager: PackageManager,
  targetDir: string,
  run: CommandRunner = runCommand,
): Promise<void> {
  if (packageManager === 'none') {
    return;
  }

  if (packageManager === 'npm') {
    console.info(chalk.cyan('\nInstalling dependencies with npm...\n'));
    await run('npm', ['install'], targetDir);

    return;
  }

  console.info(chalk.cyan(`\nEnabling Corepack for ${packageManager === 'yarn' ? 'Yarn Berry' : 'pnpm'}...\n`));

  try {
    await run('corepack', ['enable'], targetDir);
  } catch (error) {
    throw new Error(
      `Corepack could not be enabled. Run "corepack enable" with permission, then run "${packageManager} install" in the generated project.`,
      { cause: error },
    );
  }

  if (packageManager === 'pnpm') {
    console.info(chalk.cyan('\nSelecting pnpm and installing dependencies...\n'));
    await run('corepack', ['use', 'pnpm@latest'], targetDir);

    return;
  }

  console.info(chalk.cyan('\nInstalling dependencies with Yarn Berry...\n'));
  await run('yarn', ['install'], targetDir);
}

export async function initializeGitRepository(
  targetDir: string,
  run: CommandRunner = runCommand,
): Promise<boolean> {
  try {
    await run('git', ['init', '--quiet'], targetDir);

    return true;
  } catch {
    return false;
  }
}

/**
 * Download file helper
 */
async function downloadFile(url: string, destination: string, redirects = 0): Promise<void> {
  if (redirects > 5) {
    throw new Error('Too many redirects while downloading the render pack');
  }

  await fs.ensureDir(path.dirname(destination));

  await new Promise<void>((resolve, reject) => {
    const req = https.get(url, { headers: { ['User-Agent']: '@bedrock-core/cli' }, agent: false }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Redirect
        res.destroy();
        downloadFile(new URL(res.headers.location, url).toString(), destination, redirects + 1).then(resolve).catch(reject);

        return;
      }

      if (res.statusCode !== 200) {
        res.destroy();
        reject(new Error(`Download failed: ${res.statusCode} ${res.statusMessage}`));

        return;
      }

      const contentLength = Number(res.headers['content-length'] ?? 0);

      if (contentLength > 100 * 1024 * 1024) {
        res.destroy();
        reject(new Error('Render pack download is too large'));

        return;
      }

      const file = fs.createWriteStream(destination);
      let size = 0;

      res.on('data', (chunk: Buffer) => {
        size += chunk.length;

        if (size > 100 * 1024 * 1024) {
          res.destroy(new Error('Render pack download is too large'));
        }
      });
      res.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          resolve();
        });
      });

      res.on('error', (error) => {
        file.destroy();
        fs.remove(destination).catch(() => {});
        reject(error);
      });
      file.on('error', (error) => {
        res.destroy();
        fs.remove(destination).catch(() => {});
        reject(error);
      });
    });

    req.setTimeout(60_000, () => req.destroy(new Error('Render pack download timed out')));
    req.on('error', (err) => {
      fs.remove(destination).catch(() => {});
      reject(err);
    });
  });
}

/**
 * Download the render pack attached to the release matching the template's
 * exact UI dependency. Releases are package-tagged in this monorepo, so the
 * repository-wide `latest` release is not a compatible selector.
 */
async function downloadLatestMcpack(targetDir: string, spinner: Ora, uiVersion: string): Promise<string | undefined> {
  const releaseTag = `@bedrock-core/ui@${uiVersion}`;
  const expectedAssetName = `core-ui-${uiVersion}.mcpack`;
  const assetUrl = `https://github.com/bedrock-core/ui/releases/download/${encodeURIComponent(releaseTag)}/${encodeURIComponent(expectedAssetName)}`;

  try {
    spinner.text = `Downloading ${expectedAssetName}...`;
    const includeDir = path.join(targetDir);

    await fs.ensureDir(includeDir);
    const dest = path.join(includeDir, expectedAssetName);

    await downloadFile(assetUrl, dest);
    spinner.succeed(`Downloaded ${expectedAssetName}`);

    return expectedAssetName;
  } catch (e) {
    spinner.warn(`Skipped downloading release asset: ${getErrorMessage(e)}`);

    return undefined;
  }
}

async function readTemplateUiVersion(templateDir: string): Promise<string> {
  const packageJson: unknown = await fs.readJson(path.join(templateDir, 'package.json'));
  const dependencies = isRecord(packageJson) && isRecord(packageJson.dependencies)
    ? packageJson.dependencies
    : undefined;
  const version = dependencies?.['@bedrock-core/ui'];

  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error('Template @bedrock-core/ui dependency must be an exact SemVer for render-pack matching');
  }

  return version;
}

/**
 * Display success message with next steps
 */
function displayNextSteps(
  config: ProjectConfig,
  mcpackName: string | undefined,
  uiVersion: string,
  gitInitialized: boolean,
): void {
  console.info('\n' + chalk.green('✔ Project created successfully!'));
  console.info('\n' + chalk.bold('Next steps:') + '\n');
  console.info(chalk.cyan(`  cd ${config.projectName}`));

  if (!gitInitialized) {
    console.info(chalk.cyan('  git init') + chalk.gray(' (optional; Git was not available)'));
  }

  if (config.packageManager === 'yarn') {
    console.info(chalk.cyan('  yarn regolith-install'));
    console.info(chalk.cyan('  yarn build'));
  } else if (config.packageManager === 'npm') {
    console.info(chalk.cyan('  npm run regolith-install'));
    console.info(chalk.cyan('  npm run build'));
  } else if (config.packageManager === 'pnpm') {
    console.info(chalk.cyan('  pnpm regolith-install'));
    console.info(chalk.cyan('  pnpm build'));
  } else {
    console.info(chalk.cyan('  yarn install') + chalk.gray(' (or npm install / pnpm install)'));
    console.info(chalk.cyan('  yarn regolith-install') + chalk.gray(' (or npm run regolith-install / pnpm regolith-install)'));
    console.info(chalk.cyan('  yarn build') + chalk.gray(' (or npm run build / pnpm build)'));
  }

  console.info(
    chalk.gray('  The first build writes the Minecraft document types, so the .ts templates in'),
  );
  console.info(chalk.gray('  packs/BP/blocks and packs/BP/entities autocomplete once it has run.'));

  console.info(
    chalk.gray('  See packs/BP/scripts/UI/screens/ to explore the starter screens and navigation.'),
  );

  console.info('\n' + chalk.bold('Render pack:') + '\n');

  if (mcpackName) {
    console.info(
      chalk.cyan(`  Install: open "./${mcpackName}"`) + chalk.gray(' (double-click to import into Minecraft)'),
    );
  } else {
    console.info(
      chalk.cyan('  Download the matching .mcpack from: ') + chalk.gray(`https://github.com/bedrock-core/ui/releases/tag/${encodeURIComponent(`@bedrock-core/ui@${uiVersion}`)}`),
    );

    console.info(chalk.cyan('  Then open the .mcpack file to import it into Minecraft.'));
  }

  console.info('\n' + chalk.bold('Development:') + '\n');

  if (config.packageManager === 'npm') {
    console.info(chalk.cyan('  npm run watch') + chalk.gray(' - Watch mode for auto-rebuild'));
    console.info(chalk.cyan('  npm run lint') + chalk.gray(' - Lint your code'));
  } else if (config.packageManager === 'pnpm') {
    console.info(chalk.cyan('  pnpm watch') + chalk.gray(' - Watch mode for auto-rebuild'));
    console.info(chalk.cyan('  pnpm lint') + chalk.gray(' - Lint your code'));
  } else if (config.packageManager === 'none') {
    console.info(chalk.cyan('  yarn watch') + chalk.gray(' (or npm run watch / pnpm watch)'));
    console.info(chalk.cyan('  yarn lint') + chalk.gray(' (or npm run lint / pnpm lint)'));
  } else {
    console.info(chalk.cyan('  yarn watch') + chalk.gray(' - Watch mode for auto-rebuild'));
    console.info(chalk.cyan('  yarn lint') + chalk.gray(' - Lint your code'));
  }

  console.info('\n' + chalk.gray('Push a stone button in-game to see the example UI!'));
  console.info();
}

/**
 * Main function to create a new project
 */
export async function createProject(
  initialProjectName?: string,
  initialAuthor?: string,
  initialDescription?: string,
  initialPackageManager?: PackageManager,
): Promise<void> {
  console.info(chalk.bold.cyan('\n@bedrock-core/ui') + chalk.gray(' - Project Generator\n'));

  // Get user input
  const config = await promptUser(initialProjectName, initialAuthor, initialDescription, initialPackageManager);

  // Check if target directory exists and is not empty
  const isEmpty = await isDirectoryEmpty(config.targetDir);

  if (!isEmpty) {
    throw new Error(
      `Directory "${config.projectName}" already exists and is not empty. Please choose a different name.`,
    );
  }

  // Generate UUIDs for manifests
  const uuids = generateManifestUUIDs();

  // Prepare template variables. CREATOR_ID / PACK_ID are the sanitized
  // identifiers used for core.register(), the addon namespace
  // (<creator>_<pack> — guides/i18n keys, config, state) and generated
  // block/entity identifiers.
  const variables = {
    PROJECT_NAME: config.projectName,
    AUTHOR: config.author,
    DESCRIPTION: config.description,
    CREATOR_ID: toIdentifier(config.author),
    PACK_ID: toIdentifier(config.projectName),
    ...uuids,
  };

  const spinner = ora('Creating project...').start();
  let projectCreated = false;

  try {
    // Get template directory
    const templateDir = getTemplateDir();

    if (!await fs.pathExists(templateDir)) {
      throw new Error(`Template directory not found at: ${templateDir}`);
    }

    // Create target directory
    await fs.ensureDir(config.targetDir);

    // Copy and process template
    await copyTemplate(templateDir, config.targetDir, variables, spinner, config.packageManager);

    spinner.text = 'Initializing Git repository...';
    const gitInitialized = await initializeGitRepository(config.targetDir);

    spinner.succeed('Project created!');
    projectCreated = true;

    if (!gitInitialized) {
      console.warn(chalk.yellow('Git was not available; the project was created without a repository.'));
    }

    // Try fetching the render pack matching the template UI version
    const dlSpinner = ora('Integrating matching core-ui build...').start();
    const templateUiVersion = await readTemplateUiVersion(templateDir);
    const mcpackName = await downloadLatestMcpack(config.targetDir, dlSpinner, templateUiVersion);

    try {
      await installDependencies(config.packageManager, config.targetDir);
    } catch (error) {
      console.warn(chalk.yellow('\nProject files were created, but dependency installation failed.'));

      throw error;
    }

    displayNextSteps(config, mcpackName, templateUiVersion, gitInitialized);
  } catch (error) {
    if (!projectCreated) {
      spinner.fail('Failed to create project');
    }

    throw error;
  }
}

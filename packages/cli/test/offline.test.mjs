import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { projectNameError } from '../dist/prompts.js';
import { replaceVariables } from '../dist/utils.js';
import { configurePackageManager, initializeGitRepository, installDependencies } from '../dist/generator.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(here, '..');
const templateDir = path.join(packageDir, 'templates', 'bedrock-core');

test('positional project names use the same npm validation as prompts', () => {
  assert.equal(projectNameError('valid-addon'), undefined);
  assert.match(projectNameError('Invalid_Name') ?? '', /lowercase|name|character/i);
});

test('template replacement is literal and single-pass', () => {
  const result = replaceVariables(
    '{{DESCRIPTION}} / {{AUTHOR}} / {{UNKNOWN}}',
    { DESCRIPTION: '$& {{AUTHOR}}', AUTHOR: "O'Brien" },
  );

  assert.equal(result, "$& {{AUTHOR}} / O'Brien / {{UNKNOWN}}");
});

test('published template keeps pack-safe Yarn config and ignores npm lockfiles', async () => {
  const yarnrc = await readFile(path.join(templateDir, 'yarnrc.yml'), 'utf8');
  const eslint = await readFile(path.join(templateDir, 'eslint.config.mjs'), 'utf8');
  const templatePackage = JSON.parse(await readFile(path.join(templateDir, 'package.json'), 'utf8'));

  assert.match(yarnrc, /nodeLinker:\s+node-modules/);
  assert.match(yarnrc, /npmPreapprovedPackages:/);
  assert.match(eslint, /package-lock\.json/);
  const uiPackage = JSON.parse(await readFile(path.resolve(packageDir, '..', '..', 'package.json'), 'utf8'));
  assert.equal(templatePackage.dependencies['@bedrock-core/ui'], uiPackage.version);
  await assert.rejects(access(path.join(templateDir, '.yarnrc.yml')));
});

test('starter structure is preserved as the reusable server fixture', async () => {
  const templateStructure = await readFile(path.join(
    templateDir,
    'packs', 'BP', 'structures', 'example', 'the_addon_loads.mcstructure',
  ));
  const tests = await readFile(path.join(templateDir, 'packs', 'BP', 'scripts', 'tests', 'index.ts'), 'utf8');
  const digest = createHash('sha256').update(templateStructure).digest('hex');

  assert.equal(templateStructure.length, 480);
  assert.equal(digest, '98203c124f9eec57eff10848ef67aa301ff3c8471cc843cccbf9f014db15f2e9');
  assert.match(tests, /structureName\('example:the_addon_loads'\)/);
});

test('template behavior manifests use the current render-pack version', async () => {
  const render = JSON.parse(await readFile(path.resolve(packageDir, '..', 'resource-pack', 'packs', 'RP', 'manifest.json'), 'utf8'));

  for (const file of ['manifest.json', 'manifest.test.json']) {
    const manifest = JSON.parse(await readFile(path.join(templateDir, 'packs', 'BP', file), 'utf8'));
    const dependency = manifest.dependencies.find(({ uuid }) => uuid === render.header.uuid);

    assert.equal(dependency?.version, render.header.version);
  }
});

test('dependency installation follows the selected package manager', async () => {
  const calls = [];
  const run = async (command, args, cwd) => { calls.push({ command, args, cwd }); };

  await installDependencies('yarn', '/project', run);
  assert.deepEqual(calls.splice(0), [
    { command: 'corepack', args: ['enable'], cwd: '/project' },
    { command: 'yarn', args: ['install'], cwd: '/project' },
  ]);

  await installDependencies('npm', '/project', run);
  assert.deepEqual(calls.splice(0), [
    { command: 'npm', args: ['install'], cwd: '/project' },
  ]);

  await installDependencies('pnpm', '/project', run);
  assert.deepEqual(calls.splice(0), [
    { command: 'corepack', args: ['enable'], cwd: '/project' },
    { command: 'corepack', args: ['use', 'pnpm@latest'], cwd: '/project' },
  ]);

  await installDependencies('none', '/project', run);
  assert.deepEqual(calls, []);
});

test('project generation initializes Git without creating a commit', async () => {
  const calls = [];
  const run = async (command, args, cwd) => { calls.push({ command, args, cwd }); };

  assert.equal(await initializeGitRepository('/project', run), true);

  assert.deepEqual(calls, [
    { command: 'git', args: ['init', '--quiet'], cwd: '/project' },
  ]);
});

test('project generation continues when Git is unavailable', async () => {
  assert.equal(await initializeGitRepository('/project', async () => {
    throw new Error('spawn git ENOENT');
  }), false);
});

test('non-Yarn scaffolds do not retain Yarn-only project metadata', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bedrock-cli-manager-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'test', packageManager: 'yarn@4.18.0' }));
  await writeFile(path.join(dir, '.yarnrc.yml'), 'nodeLinker: node-modules\n');

  await configurePackageManager('npm', dir);

  const manifest = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(manifest.packageManager, undefined);
  await assert.rejects(access(path.join(dir, '.yarnrc.yml')));
});

test('pnpm scaffolds use a conventional hoisted node_modules layout', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bedrock-cli-pnpm-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'test', packageManager: 'yarn@4.18.0' }));
  await writeFile(path.join(dir, '.yarnrc.yml'), 'nodeLinker: node-modules\n');

  await configurePackageManager('pnpm', dir);

  assert.equal(await readFile(path.join(dir, 'pnpm-workspace.yaml'), 'utf8'), 'nodeLinker: hoisted\n');
  await assert.rejects(access(path.join(dir, '.yarnrc.yml')));
});

test('skipping installation leaves a manager-neutral manifest', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bedrock-cli-skip-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'test', packageManager: 'yarn@4.18.0' }));
  await writeFile(path.join(dir, '.yarnrc.yml'), 'nodeLinker: node-modules\n');

  await configurePackageManager('none', dir);

  const manifest = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
  assert.equal(manifest.packageManager, undefined);
  await access(path.join(dir, '.yarnrc.yml'));
});

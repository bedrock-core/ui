#!/usr/bin/env node
// Exercise the exact yarn-packed artifact in an unrelated, disposable Linux
// directory. Requires Node, Yarn Berry, Regolith and unzip (CI or a container).
// Usage: node scripts/smoke-cli.mjs /absolute/path/cli.tgz [output-directory]
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

assert.equal(process.platform, 'linux', 'Run the artifact smoke test in Linux CI or a disposable container');
assert.ok(process.argv[2], 'Usage: node scripts/smoke-cli.mjs <cli.tgz> [output-directory]');
const tarball = resolve(process.argv[2]);
assert.ok(existsSync(tarball), `Missing CLI tarball: ${tarball}`);
const parent = process.argv[3] ? resolve(process.argv[3]) : tmpdir();
mkdirSync(parent, { recursive: true });
const root = mkdtempSync(join(parent, 'bedrock-cli-smoke-'));
const tooling = join(root, 'tooling');
mkdirSync(tooling);
writeFileSync(join(tooling, 'package.json'), JSON.stringify({ private: true }));
writeFileSync(join(root, 'npmrc'), 'registry=https://registry.npmjs.org\n');

// Only carry the executable path and locale into package managers. A new home
// and explicit npm config prevent runner/developer auth or registry overrides
// from changing what an unauthenticated new user sees.
const env = {
  PATH: process.env.PATH,
  LANG: process.env.LANG ?? 'C.UTF-8',
  CI: 'true',
  npm_config_userconfig: join(root, 'npmrc'),
  YARN_ENABLE_GLOBAL_CACHE: 'false',
};
if (process.env.BC_BDS_HOME) env.BC_BDS_HOME = process.env.BC_BDS_HOME;
function isolateHome(label) {
  const home = join(root, `${label}-home`);
  mkdirSync(home);
  env.HOME = home;
  env.XDG_CONFIG_HOME = join(home, '.config');
  env.XDG_CACHE_HOME = join(home, '.cache');
  env.npm_config_cache = join(home, 'npm-cache');
}
isolateHome('tooling');
// The smoke directory has no lock yet, even when CI=true. The next Yarn install
// below explicitly tests the resulting lockfile with --immutable.
env.YARN_ENABLE_IMMUTABLE_INSTALLS = 'false';

function run(command, args, cwd, capture = false, timeout = 600_000) {
  console.log(`smoke: ${command} ${args.join(' ')} (${cwd})`);
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', timeout });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} failed (${result.status})\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  return result.stdout;
}
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const summary = { tarball, sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'), root, projects: [] };
console.log(`smoke: evidence directory ${root}`);
try {
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact', tarball], tooling);
  const installed = join(tooling, 'node_modules/@bedrock-core/cli');
  const manifest = json(join(installed, 'package.json'));
  assert.equal(manifest.name, '@bedrock-core/cli');
  const cli = join(installed, 'dist/index.js');
  assert.equal(run(process.execPath, [cli, '--version'], root, true).trim(), manifest.version);
  summary.version = manifest.version;

  const invalid = spawnSync(process.execPath, [cli, 'Invalid_Name', '--author', 'reviewer', '--description', 'test', '--package-manager', 'none'], {
    cwd: root, env, encoding: 'utf8', timeout: 30_000,
  });
  assert.equal(invalid.status, 1, 'Invalid positional package names must fail');
  assert.ok(!existsSync(join(root, 'Invalid_Name')), 'Invalid names must not create files');

  isolateHome('none');
  run(process.execPath, [cli, 'none-smoke', '--author', 'reviewer', '--description', 'no install', '--package-manager', 'none'], root);
  const noInstallProject = join(root, 'none-smoke');
  const noInstallPackage = json(join(noInstallProject, 'package.json'));
  assert.equal(noInstallPackage.packageManager, undefined);
  assert.ok(existsSync(join(noInstallProject, '.git')), 'The no-install choice must initialize Git');
  assert.equal(run('git', ['rev-parse', '--is-inside-work-tree'], noInstallProject, true).trim(), 'true');
  assert.ok(!existsSync(join(noInstallProject, 'package-lock.json')));
  assert.ok(!existsSync(join(noInstallProject, 'yarn.lock')));
  assert.ok(!existsSync(join(noInstallProject, 'pnpm-lock.yaml')));

  const author = "O'Brien";
  const description = 'An addon with "quotes", a \\ path, and literal $&.';
  for (const manager of ['npm', 'yarn', 'pnpm']) {
    isolateHome(manager);
    const name = `${manager}-smoke`;
    run(process.execPath, [cli, name, '--author', author, '--description', description, '--package-manager', manager], root, false, 600_000);
    const project = join(root, name);
    const pkg = json(join(project, 'package.json'));
    assert.equal(pkg.description, description);
    assert.equal(json(join(project, 'config.json')).author, author);
    assert.ok(existsSync(join(project, '.gitignore')), 'Packed template must restore .gitignore');
    assert.ok(existsSync(join(project, '.git')), 'The CLI must initialize a Git repository');
    assert.equal(run('git', ['rev-parse', '--is-inside-work-tree'], project, true).trim(), 'true');
    const head = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: project, env, encoding: 'utf8' });
    assert.notEqual(head.status, 0, 'The CLI must leave the initial commit to the user');
    const version = pkg.dependencies['@bedrock-core/ui'];
    assert.match(version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'Pin the UI release paired with the render asset');
    const asset = join(project, `core-ui-${version}.mcpack`);
    assert.ok(existsSync(asset), 'The CLI must download the matching render asset');
    const renderPack = JSON.parse(run('unzip', ['-p', asset, 'manifest.json'], project, true));
    for (const file of ['manifest.json', 'manifest.test.json']) {
      const dependency = json(join(project, 'packs/BP', file)).dependencies.find(dep => dep.uuid === renderPack.header.uuid);
      assert.equal(dependency?.version, renderPack.header.version, `${file} must require the downloaded render pack`);
    }

    if (manager === 'npm') {
      assert.equal(pkg.packageManager, undefined);
      assert.ok(!existsSync(join(project, '.yarnrc.yml')));
      assert.ok(existsSync(join(project, 'package-lock.json')));
      run('npm', ['ci', '--no-audit', '--no-fund'], project);
    } else if (manager === 'yarn') {
      assert.match(pkg.packageManager, /^yarn@/);
      const yarnrc = readFileSync(join(project, '.yarnrc.yml'), 'utf8');
      assert.match(yarnrc, /nodeLinker:\s*node-modules/);
      assert.match(yarnrc, /npmPreapprovedPackages:[\s\S]*@bedrock-core\/\*/);
      assert.ok(existsSync(join(project, 'yarn.lock')));
      run('yarn', ['install', '--immutable'], project);
    } else {
      assert.match(pkg.packageManager, /^pnpm@/);
      assert.ok(!existsSync(join(project, '.yarnrc.yml')));
      assert.match(readFileSync(join(project, 'pnpm-workspace.yaml'), 'utf8'), /^nodeLinker:\s*hoisted$/m);
      assert.ok(existsSync(join(project, 'pnpm-lock.yaml')));
      run('pnpm', ['install', '--frozen-lockfile'], project);
    }
    const script = name => manager === 'npm'
      ? run('npm', ['run', name], project)
      : run(manager, [name], project);
    script('regolith-install');
    script('build');
    const releaseBp = join(project, 'build', `${name}_bp`);
    assert.ok(!json(join(releaseBp, 'manifest.json')).dependencies.some(dep => dep.module_name === '@minecraft/server-gametest'));
    assert.ok(!readFileSync(join(releaseBp, 'scripts/main.js'), 'utf8').includes('@minecraft/server-gametest'));
    script('build:test');
    const testManifest = json(join(project, 'build/test/BP/manifest.json'));
    assert.ok(testManifest.dependencies.some(dep => dep.module_name === '@minecraft/server-gametest'));
    script('lint');
    run(process.execPath, [join(project, 'node_modules/typescript/bin/tsc'), '--noEmit'], project);

    const require = createRequire(join(project, 'package.json'));
    const ts = require('typescript');
    const localeFile = join(project, 'packs/data/i18n/en_US.ts');
    const localeJs = ts.transpileModule(readFileSync(localeFile, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
    }).outputText;
    const locale = (await import(`data:text/javascript;base64,${Buffer.from(localeJs).toString('base64')}`)).default;
    assert.equal(locale.meta.creator, author);
    assert.equal(locale.meta.description, description);

    const resultFile = join(root, `${name}-gametest.json`);
    run('npm', ['exec', '--yes', '--package=@bedrock-core/bds-runner@0.1.0', '--', 'bc-bds', 'run',
      '--packs', './build/test/BP', '--tag', 'example', '--expect-registered', '1',
      '--bds-version', '1.26.51.1', '--idle', '10', '--timeout', '120', '--quiet', '--json', resultFile], project);
    const game = json(resultFile);
    assert.equal(game.verdicts.length, 1);
    assert.equal(game.verdicts[0].outcome, 'pass');
    assert.deepEqual(game.scriptErrors, []);
    assert.equal(game.infraError, null);

    const before = readdirSync(project).sort();
    const refusal = spawnSync(process.execPath, [cli, name, '--author', author, '--description', 'overwrite', '--package-manager', 'none'], {
      cwd: root, env, encoding: 'utf8', timeout: 30_000,
    });
    assert.equal(refusal.status, 1, 'Existing projects must not be overwritten');
    assert.deepEqual(readdirSync(project).sort(), before);
    assert.equal(json(join(project, 'package.json')).description, description);
    summary.projects.push({ manager, project, uiVersion: version, renderVersion: renderPack.header.version, gametest: game, passed: true });
  }
  summary.passed = true;
} catch (error) {
  summary.passed = false;
  summary.error = error.stack ?? String(error);
  throw error;
} finally {
  writeFileSync(join(root, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  if (process.env.BEDROCK_CLI_SMOKE_SUMMARY) {
    writeFileSync(process.env.BEDROCK_CLI_SMOKE_SUMMARY, JSON.stringify(summary, null, 2) + '\n');
  }
  console.log(`smoke: results ${join(root, 'summary.json')}`);
}

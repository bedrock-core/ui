import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire, findPackageJSON } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repository = fileURLToPath(new URL('../', import.meta.url));
const navigation = path.join(repository, 'packages/navigation');
const within = (root, file) => {
  const relative = path.relative(root, file);

  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

test('packed Navigation regenerates its API and bundles its public entries for an isolated consumer', async t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'core-navigation-package-'));

  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  });

  const yarn = process.env.COREPACK_ROOT ? path.join(process.env.COREPACK_ROOT, 'dist/yarn.js') : process.env.npm_execpath;

  assert.ok(yarn && /yarn[^/\\]*\.(?:c?js)$/.test(yarn), 'Run this package acceptance test with yarn test:release.');

  const archive = path.join(directory, 'navigation.tgz');
  const generated = path.join(navigation, 'dist/core/api.ts');
  const previous = existsSync(generated) ? readFileSync(generated) : undefined;

  if (previous) { assert.ok(within(navigation, realpathSync(generated))); }
  rmSync(generated, { force: true });

  try {
    execFileSync(process.execPath, [yarn, 'workspace', '@bedrock-core/navigation', 'pack', '--out', archive], {
      cwd: repository,
      stdio: 'pipe',
      env: { ...process.env, COREPACK_ENABLE_NETWORK: '0', YARN_ENABLE_NETWORK: '0' },
    });
  } catch (error) {
    if (previous) { writeFileSync(generated, previous); }
    throw error;
  }

  assert.ok(existsSync(generated), 'Navigation prepack must recreate the missing generated API');

  const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split(/\r?\n/);
  const standard = new Set(['package/package.json', 'package/README.md', 'package/LICENSE', 'package/CHANGELOG.md']);

  assert.ok(entries.every(file => file.startsWith('package/') && !file.split('/').includes('..')));
  assert.ok(entries.every(file => standard.has(file) || file.startsWith('package/src/') || file === 'package/dist/core/api.ts'), 'Only authored sources and the generated API entry may ship');
  assert.ok(entries.every(file => !/(?:^|\/)(?:__tests__|__fixtures__|node_modules|coverage|\.cache|\.bedrock-core|\.bds)(?:\/|$)/.test(file)
    && !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file) && !/\/api\.generated(?:\.[^/]*)?$/.test(file)), 'Tests, caches and source-generated API siblings must stay out of the archive');
  assert.ok(entries.includes('package/dist/core/api.ts'));
  assert.ok(entries.includes('package/src/core/api.ts'));

  execFileSync('tar', ['-xzf', archive, '-C', directory]);

  const consumer = path.join(directory, 'consumer');
  const modules = path.join(consumer, 'node_modules');
  const installed = path.join(modules, '@bedrock-core/navigation');

  mkdirSync(path.dirname(installed), { recursive: true });
  renameSync(path.join(directory, 'package'), installed);
  writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ name: 'navigation-consumer', private: true, type: 'module' }));

  const manifest = JSON.parse(readFileSync(path.join(installed, 'package.json'), 'utf8'));

  assert.deepEqual(Object.keys(manifest.exports).sort(), ['.', './core', './runtime']);
  for (const entry of Object.values(manifest.exports)) {
    for (const target of Object.values(entry)) { assert.ok(entries.includes('package/' + target.replace(/^\.\//, ''))); }
  }
  assert.equal(manifest.dependencies['@bedrock-core/server-runtime'], undefined);
  assert.equal(manifest.peerDependenciesMeta['@bedrock-core/server-runtime'].optional, true);

  const generatedFile = path.join(installed, 'dist/core/api.ts');
  const relativeImports = [...readFileSync(generatedFile, 'utf8').matchAll(/\bfrom\s+(['"])(\.[^'"]+)\1/g)];

  assert.ok(relativeImports.length > 0);
  for (const [, , specifier] of relativeImports) {
    const base = path.resolve(path.dirname(generatedFile), specifier);
    const target = [base, base + '.ts', base + '.tsx'].find(file => existsSync(file));

    assert.ok(target && within(installed, realpathSync(target)), 'Generated relative imports must resolve inside the archive: ' + specifier);
  }

  const navigationMetadata = pathToFileURL(path.join(navigation, 'package.json'));
  const require = createRequire(navigationMetadata);
  const link = (name, owner = navigationMetadata) => {
    const target = path.join(modules, name);
    const metadata = findPackageJSON(name, owner);

    assert.ok(metadata, 'The installed dependency must have package metadata: ' + name);
    mkdirSync(path.dirname(target), { recursive: true });
    symlinkSync(realpathSync(path.dirname(metadata)), target, process.platform === 'win32' ? 'junction' : 'dir');
  };

  for (const name of Object.keys(manifest.dependencies)) { link(name); }
  if (manifest.peerDependencies['@bedrock-core/i18n']) { link('@bedrock-core/i18n', pathToFileURL(findPackageJSON('@bedrock-core/ui-runtime', navigationMetadata))); }

  const { build } = createRequire(require.resolve('@bedrock-core/builder-bundler'))('esbuild');
  const bundle = async specifier => {
    const result = await build({
      absWorkingDir: consumer,
      stdin: { contents: `export * from ${JSON.stringify(specifier)};`, resolveDir: consumer, sourcefile: 'consumer.ts', loader: 'ts' },
      bundle: true,
      write: false,
      metafile: true,
      format: 'esm',
      platform: 'node',
      target: 'es2022',
      external: ['@minecraft/*'],
      jsx: 'automatic',
      jsxImportSource: '@bedrock-core/ui-runtime',
      tsconfigRaw: {},
      nodePaths: [],
      logLevel: 'silent',
    });
    const inputs = Object.keys(result.metafile.inputs).map(file => path.resolve(consumer, file));

    assert.ok(inputs.every(file => !within(navigation, file)), 'The consumer must not fall back to Navigation checkout sources');

    return inputs;
  };

  for (const entry of ['@bedrock-core/navigation', '@bedrock-core/navigation/runtime']) {
    const inputs = await bundle(entry);

    assert.ok(inputs.every(file => !/(?:^|[\\/])server-runtime[\\/]/.test(file)), 'Standalone Navigation must not load the optional Core runtime');
  }

  link('@bedrock-core/server-runtime');

  const coreInputs = await bundle('@bedrock-core/navigation/core');

  assert.ok(coreInputs.includes(generatedFile), 'The Core entry must consume the archived generated API');
  assert.ok(coreInputs.includes(path.join(installed, 'src/core/api.ts')), 'The generated factory must consume its archived authored implementation');
});

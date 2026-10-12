// Validate the libraries, export the shared resource pack, and compare every
// deployed file with the build output. Missing, changed, or extra files fail
// verification so the development folder contains exactly this build.
//
//   yarn preflight             tests + lint + typecheck + deploy + verify
//   yarn preflight --no-tests  deploy + verify only
//
// Build and development destinations come from the resource pack's profiles.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { comparePackContents } from './pack-verification.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packRoot = path.join(root, 'packages', 'resource-pack');
const flags = new Set(process.argv.slice(2));

const fail = (message) => {
  console.error(`\n✖ preflight: ${message}`);
  process.exit(1);
};

const run = (label, command, cwd, { capture = false } = {}) => {
  console.log(`\n▶ ${label}`);

  const result = spawnSync(command, {
    cwd,
    shell: true,
    stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf-8',
  });

  const output = capture ? `${result.stdout ?? ''}${result.stderr ?? ''}` : '';

  if (capture) {
    process.stdout.write(output);
  }

  return { code: result.status ?? 1, output };
};

// ---- 1. the suites -------------------------------------------------------

if (!flags.has('--no-tests')) {
  if (run('yarn test', 'yarn test', root).code !== 0) {
    fail('tests failed');
  }

  if (run('resource-pack verification tests', 'node --test scripts/pack-verification.test.ts', root).code !== 0) {
    fail('resource-pack verification tests failed');
  }

  if (run('yarn lint', 'yarn lint', root).code !== 0) {
    fail('lint failed');
  }

  // The types, which neither of the two above prove: vitest transpiles without
  // checking and ESLint ignores `__tests__`, so a `@ts-expect-error` that stopped
  // firing — or a broken signature reached only from a test — passes both. The
  // libraries only: the shared texture pack is exported and verified below.
  if (run('yarn build:libs (typecheck)', 'yarn build:libs', root).code !== 0) {
    fail('typecheck failed');
  }
}

// ---- 2. deploy through the profile the game reads -------------------------

if (run('yarn build (resource pack)', 'yarn build', packRoot).code !== 0) {
  fail('resource-pack build failed');
}

const deploy = run('yarn deploy (default profile)', 'yarn deploy', packRoot, { capture: true });

if (deploy.code !== 0) {
  fail('resource-pack deployment failed');
}

// ---- 3. the pack the game will load is the pack just built ----------------

const config = JSON.parse(fs.readFileSync(path.join(packRoot, 'config.json'), 'utf-8'));
const packRequire = createRequire(path.join(packRoot, 'package.json'));

packRequire('./.pnp.cjs').setup();
const { resolveExportPaths } = packRequire('@bedrock-core/builder/export');
const built = resolveExportPaths(packRoot, config.packs, config.bedrockCore.profiles.build.export).resourcePack;
const packName = path.basename(built);
const deployed = resolveExportPaths(packRoot, config.packs, config.bedrockCore.profiles.default.export).resourcePack;

if (!fs.existsSync(deployed)) {
  fail(`no deployed "${packName}" under ${path.dirname(deployed)}`);
}

let comparison;

try {
  comparison = comparePackContents(built, deployed);
} catch (error) {
  fail(`pack verification failed: ${error.message}`);
}

const differences = ['missing', 'changed', 'extra']
  .filter(kind => comparison[kind].length > 0)
  .map(kind => `${kind}: ${comparison[kind].slice(0, 5).join(', ')}${comparison[kind].length > 5 ? ' ...' : ''}`);

if (differences.length > 0) {
  fail(`the deployed pack differs from this build (${deployed}): ${differences.join('; ')}`);
}

console.log(`\n✔ preflight: ${comparison.files} deployed files match build ${comparison.digest.slice(0, 12)}\n  ${deployed}`);

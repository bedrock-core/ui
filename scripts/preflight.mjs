// Everything that has to be true before a change is worth a look in game:
// the suites pass, the pack built and deployed through the one path the game
// reads, and the pack the game will load is the pack that was just built.
//
// The last check is the reason this exists. A build that lands in the wrong
// folder, or a deploy blocked by a watch holding Regolith's session lock,
// looks exactly like "the change did nothing" in game. The build stamp the
// filter bakes into the HUD is read back from the deployed pack and compared
// with the one this run wrote, so a stale pack fails here instead of costing
// a round of guessing.
//
//   yarn preflight             tests + lint + typecheck + deploy + verify
//   yarn preflight --no-tests  deploy + verify only
//
// The deployed packs folder is found from the usual Bedrock locations, or
// taken from BC_DEV_PACKS when the game keeps its data elsewhere.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

  if (run('yarn lint', 'yarn lint', root).code !== 0) {
    fail('lint failed');
  }

  // The types, which neither of the two above prove: vitest transpiles without
  // checking and ESLint ignores `__tests__`, so a `@ts-expect-error` that stopped
  // firing — or a broken signature reached only from a test — passes both. The
  // libraries only: the render pack's build is a Regolith export through the
  // pinned filters, and the deploy below is what proves the pack.
  if (run('yarn build:libs (typecheck)', 'yarn build:libs', root).code !== 0) {
    fail('typecheck failed');
  }
}

// ---- 2. deploy through the profile the game reads -------------------------

const deploy = run('regolith run (development profile)', 'regolith run', packRoot, { capture: true });

if (deploy.output.includes('Failed to acquire session lock')) {
  fail('Regolith\'s session lock is held — a `regolith watch` is running. Stop it, then run preflight again.');
}

if (deploy.code !== 0) {
  fail('regolith run failed');
}

// ---- 3. the pack the game will load is the pack just built ----------------

const stampIn = (file) => {
  if (!fs.existsSync(file)) {
    return undefined;
  }

  return /"text":\s*"(ui [0-9a-f]{6} \d\d:\d\d)"/.exec(fs.readFileSync(file, 'utf-8'))?.[1];
};

const config = JSON.parse(fs.readFileSync(path.join(packRoot, 'config.json'), 'utf-8'));
const packName = `${config.name}_rp`;
// Under the demo addon's namespace, where the filter puts every screen it writes.
const stampPath = path.join('ui', 'core-ui', 'screens', 'core', 'core_build.json');
const built = stampIn(path.join(packRoot, '.regolith', 'tmp', 'RP', stampPath));

if (built === undefined) {
  fail('the build wrote no stamp — the development profile needs `"stamp": true` on the ui-compiler filter');
}

const candidates = [
  process.env.BC_DEV_PACKS,
  process.env.APPDATA && path.join(process.env.APPDATA, 'Minecraft Bedrock', 'Users', 'Shared', 'games', 'com.mojang', 'development_resource_packs'),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Packages', 'Microsoft.MinecraftUWP_8wekyb3d8bbwe', 'LocalState', 'games', 'com.mojang', 'development_resource_packs'),
].filter(Boolean);

const deployed = candidates.map(dir => path.join(dir, packName)).find(dir => fs.existsSync(dir));

if (deployed === undefined) {
  fail(`no deployed "${packName}" under any known development_resource_packs — set BC_DEV_PACKS to the game's folder`);
}

const live = stampIn(path.join(deployed, stampPath));

if (live !== built) {
  fail(`the deployed pack is stale: game has "${live ?? 'no stamp'}", this build is "${built}" (${deployed})`);
}

console.log(`\n✔ preflight: the game will load build "${built}"\n  ${deployed}`);

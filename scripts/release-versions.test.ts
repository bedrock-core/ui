import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkReleaseVersions, syncMetaVersion } from './release-versions.ts';

const UI = '@bedrock-core/ui';
const RUNTIME = '@bedrock-core/ui-runtime';
const NAVIGATION = '@bedrock-core/navigation';
const OTHER = '@bedrock-core/flexbox';
const changesetBin = fileURLToPath(import.meta.resolve('@changesets/cli/bin.js'));
const releaseConfig = JSON.parse(readFileSync(new URL('../.changeset/config.json', import.meta.url), 'utf8'));

function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), 'core-release-versions-'));
  const put = (file: string, value: unknown): void => {
    const target = join(dir, file);

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(value, null, 2) + '\n');
  };
  const read = (file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const run = (...args: string[]) => execFileSync(process.execPath, [changesetBin, ...args], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, CI: 'true' },
  });
  const change = (name: string, releases: Record<string, string>): void => {
    const entries = Object.entries(releases).map(([pkg, bump]) => `"${pkg}": ${bump}`).join('\n');

    writeFileSync(join(dir, '.changeset', `${name}.md`), `---\n${entries}\n---\n\nUpdate public APIs.\n`);
  };

  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'yarn.lock'), '');
  put('package.json', {
    name: UI, version: '0.12.1', packageManager: 'yarn@4.16.0',
    workspaces: ['packages/*'], dependencies: { [RUNTIME]: 'workspace:*' },
  });
  put('packages/ui-runtime/package.json', { name: RUNTIME, version: '0.12.1' });
  put('packages/navigation/package.json', {
    name: NAVIGATION, version: '0.12.1', dependencies: { [RUNTIME]: 'workspace:*' },
  });
  put('packages/flexbox/package.json', { name: OTHER, version: '0.12.1' });
  put('.changeset/config.json', { ...releaseConfig, changelog: false, commit: false });

  return { dir, put, read, run, change };
}

const scenarios: { name: string; releases: Record<string, string>; version: string }[] = [
  { name: 'runtime-only patch', releases: { [RUNTIME]: 'patch' }, version: '0.12.2' },
  { name: 'navigation-only minor', releases: { [NAVIGATION]: 'minor' }, version: '0.13.0' },
  { name: 'mixed bumps take the highest', releases: { [RUNTIME]: 'patch', [NAVIGATION]: 'major' }, version: '1.0.0' },
  { name: 'unrelated releases keep runtime and navigation stable', releases: { [OTHER]: 'patch' }, version: '0.12.1' },
];

for (const scenario of scenarios) {
  test(scenario.name, t => {
    const f = fixture(t);

    f.change('release', scenario.releases);
    f.run('version');
    assert.equal(f.read('packages/ui-runtime/package.json').version, scenario.version);
    assert.equal(f.read('packages/navigation/package.json').version, scenario.version);
    assert.equal(f.read('package.json').version, '0.12.1');

    execFileSync(process.execPath, [fileURLToPath(new URL('./bump-meta.mjs', import.meta.url))], { cwd: f.dir });
    assert.equal(checkReleaseVersions(f.dir), scenario.version);
    assert.equal(f.read('packages/navigation/package.json').dependencies[RUNTIME], 'workspace:*');
    assert.equal(syncMetaVersion(f.dir).changed, false);
  });
}

test('prerelease entry, subsequent releases, and stable exit stay synchronized', t => {
  const f = fixture(t);

  f.change('first', { [RUNTIME]: 'minor' });
  f.run('pre', 'enter', 'rc');
  f.run('version');
  syncMetaVersion(f.dir);
  assert.equal(checkReleaseVersions(f.dir), '0.13.0-rc.0');

  f.change('second', { [NAVIGATION]: 'patch' });
  f.run('version');
  syncMetaVersion(f.dir);
  assert.equal(checkReleaseVersions(f.dir), '0.13.0-rc.1');

  f.run('pre', 'exit');
  f.run('version');
  syncMetaVersion(f.dir);
  assert.equal(checkReleaseVersions(f.dir), '0.13.0');
});

test('version drift is rejected before modifying the root', t => {
  const f = fixture(t);
  const original = readFileSync(join(f.dir, 'package.json'), 'utf8');

  f.put('packages/navigation/package.json', {
    name: NAVIGATION, version: '0.12.2', dependencies: { [RUNTIME]: 'workspace:*' },
  });
  assert.throws(() => checkReleaseVersions(f.dir), /navigation@0\.12\.2 must match/);
  assert.throws(() => syncMetaVersion(f.dir), /navigation@0\.12\.2 must match/);
  assert.equal(readFileSync(join(f.dir, 'package.json'), 'utf8'), original);
});

test('the root must match the complete runtime version, including prerelease suffix', t => {
  const f = fixture(t);

  f.put('packages/ui-runtime/package.json', { name: RUNTIME, version: '1.0.0-rc.1' });
  f.put('packages/navigation/package.json', {
    name: NAVIGATION, version: '1.0.0-rc.1', dependencies: { [RUNTIME]: 'workspace:*' },
  });
  assert.throws(() => checkReleaseVersions(f.dir), /ui@0\.12\.1 must match/);
  assert.equal(syncMetaVersion(f.dir).version, '1.0.0-rc.1');
  assert.equal(checkReleaseVersions(f.dir), '1.0.0-rc.1');
});

test('missing fixed release policy is rejected', t => {
  const f = fixture(t);

  f.put('.changeset/config.json', { ...releaseConfig, fixed: [] });
  assert.throws(() => checkReleaseVersions(f.dir), /Changesets fixed group/);
});

for (const file of ['package.json', 'packages/navigation/package.json']) {
  test(`${file} must resolve the exact runtime version when packed`, t => {
    const f = fixture(t);

    f.put(file, { ...f.read(file), dependencies: { [RUNTIME]: 'workspace:^' } });
    assert.throws(() => checkReleaseVersions(f.dir), /pin .* through workspace:\*/);
  });
}

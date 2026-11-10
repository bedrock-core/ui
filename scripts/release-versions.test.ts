import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const UI = '@bedrock-core/ui';
const RUNTIME = '@bedrock-core/ui-runtime';
const NAVIGATION = '@bedrock-core/navigation';
const FLEXBOX = '@bedrock-core/flexbox';
const changesetBin = fileURLToPath(import.meta.resolve('@changesets/cli/bin.js'));
const changelog = import.meta.resolve('@changesets/cli/changelog');
const releaseConfig = JSON.parse(readFileSync(new URL('../.changeset/config.json', import.meta.url), 'utf8'));

function fixture(t: TestContext) {
  const temporaryRoot = realpathSync(tmpdir());
  const dir = mkdtempSync(join(temporaryRoot, 'core-native-release-'));
  const output = join(dir, 'tag-events.jsonl');
  const env = {
    ...process.env, CI: 'true', CHANGESETS_OUTPUT: output,
    GIT_AUTHOR_NAME: 'Core fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Core fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  };
  const put = (file: string, value: unknown): void => {
    const target = join(dir, file);

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(value, null, 2) + '\n');
  };
  const read = (file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const run = (...args: string[]) => execFileSync(process.execPath, [changesetBin, ...args], {
    cwd: dir, encoding: 'utf8', env,
  });
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
  const change = (name: string, releases: Record<string, string>): void => {
    const entries = Object.entries(releases).map(([pkg, bump]) => `"${pkg}": ${bump}`).join('\n');

    writeFileSync(join(dir, '.changeset', `${name}.md`), `---\n${entries}\n---\n\nUpdate public APIs.\n`);
  };

  t.after(() => {
    const target = realpathSync(dir);

    assert.equal(dirname(target), temporaryRoot);
    rmSync(target, { recursive: true, force: true });
  });
  writeFileSync(join(dir, 'yarn.lock'), '');
  put('package.json', {
    name: UI, version: '0.12.1', packageManager: 'yarn@4.16.0',
    workspaces: ['.', 'packages/*'],
    dependencies: { [RUNTIME]: 'workspace:*', [NAVIGATION]: 'workspace:*', [FLEXBOX]: 'workspace:*' },
  });
  put('packages/ui-runtime/package.json', { name: RUNTIME, version: '0.12.1' });
  put('packages/navigation/package.json', {
    name: NAVIGATION, version: '1.4.0', dependencies: { [RUNTIME]: 'workspace:*' },
  });
  put('packages/flexbox/package.json', { name: FLEXBOX, version: '0.12.1' });
  put('.changeset/config.json', { ...releaseConfig, changelog, commit: false });
  git('init', '--quiet');

  return { dir, output, read, run, git, change };
}

test('the root and runtime share a native fixed group while navigation remains independent', () => {
  const root = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const runtime = JSON.parse(readFileSync(new URL('../packages/ui-runtime/package.json', import.meta.url), 'utf8'));

  assert.ok(root.workspaces.includes('.'));
  assert.equal(root.version, runtime.version);
  assert.ok(releaseConfig.fixed.some((group: string[]) => group.length === 2 && group.includes(UI) && group.includes(RUNTIME)));
  assert.ok(releaseConfig.fixed.every((group: string[]) => !group.includes(NAVIGATION)));
  assert.equal(root.dependencies[RUNTIME], 'workspace:*');
  assert.equal(root.dependencies[NAVIGATION], 'workspace:*');
});

const scenarios: { name: string; releases: Record<string, string>; runtime: string; navigation: string; flexbox?: string }[] = [
  { name: 'runtime patch versions the root and its exact dependents', releases: { [RUNTIME]: 'patch' }, runtime: '0.12.2', navigation: '1.4.1' },
  { name: 'root patch versions the runtime through the fixed group', releases: { [UI]: 'patch' }, runtime: '0.12.2', navigation: '1.4.1' },
  { name: 'navigation minor retains its own version and releases exact dependents', releases: { [NAVIGATION]: 'minor' }, runtime: '0.12.2', navigation: '1.5.0' },
  { name: 'mixed runtime and navigation changes retain their release levels', releases: { [RUNTIME]: 'patch', [NAVIGATION]: 'major' }, runtime: '0.12.2', navigation: '2.0.0' },
  { name: 'the largest fixed-group bump applies to root and runtime', releases: { [UI]: 'minor', [RUNTIME]: 'patch' }, runtime: '0.13.0', navigation: '1.4.1' },
  { name: 'other umbrella dependencies cause normal dependent patch releases', releases: { [FLEXBOX]: 'patch' }, runtime: '0.12.2', navigation: '1.4.1', flexbox: '0.12.2' },
];

for (const scenario of scenarios) {
  test(scenario.name, t => {
    const f = fixture(t);

    f.change('release', scenario.releases);
    f.run('version');
    assert.equal(f.read('package.json').version, scenario.runtime);
    assert.equal(f.read('packages/ui-runtime/package.json').version, scenario.runtime);
    assert.equal(f.read('packages/navigation/package.json').version, scenario.navigation);
    assert.equal(f.read('packages/flexbox/package.json').version, scenario.flexbox ?? '0.12.1');
    assert.equal(f.read('package.json').dependencies[RUNTIME], 'workspace:*');
    assert.equal(f.read('packages/navigation/package.json').dependencies[RUNTIME], 'workspace:*');
  });
}

test('native prerelease counters and stable promotion keep root and runtime equal', t => {
  const f = fixture(t);
  const assertVersions = (runtime: string, navigation: string): void => {
    assert.equal(f.read('package.json').version, runtime);
    assert.equal(f.read('packages/ui-runtime/package.json').version, runtime);
    assert.equal(f.read('packages/navigation/package.json').version, navigation);
  };

  f.change('first', { [RUNTIME]: 'minor' });
  f.run('pre', 'enter', 'rc');
  f.run('version');
  assertVersions('0.13.0-rc.0', '1.4.1-rc.0');

  f.change('second', { [NAVIGATION]: 'patch' });
  f.run('version');
  assertVersions('0.13.0-rc.1', '1.4.1-rc.1');

  f.run('pre', 'exit');
  f.run('version');
  assertVersions('0.13.0', '1.4.1');
});

test('native versioning writes a changelog for the root package', t => {
  const f = fixture(t);

  f.change('release', { [UI]: 'patch' });
  f.run('version');
  const contents = readFileSync(join(f.dir, 'CHANGELOG.md'), 'utf8');

  assert.match(contents, /^# @bedrock-core\/ui/);
  assert.match(contents, /## 0\.12\.2/);
  assert.match(contents, /Update public APIs\./);
});

test('native tagging reports the root package to Changesets Action and is idempotent', t => {
  const f = fixture(t);

  f.change('release', { [RUNTIME]: 'patch' });
  f.run('version');
  f.git('add', '--all');
  f.git('commit', '--quiet', '-m', 'Release fixture');
  f.run('git-tag');
  const output = readFileSync(f.output, 'utf8');
  const events = output.trim().split('\n').map(line => JSON.parse(line));

  assert.deepEqual(events.find(event => event.packageName === UI), {
    type: 'git-tag', tag: `${UI}@0.12.2`, packageName: UI,
  });
  assert.deepEqual(events.map(event => event.packageName).sort(), [UI, RUNTIME, NAVIGATION, FLEXBOX].sort());
  assert.deepEqual(f.git('tag', '--list').trim().split('\n').sort(), [
    `${UI}@0.12.2`, `${RUNTIME}@0.12.2`, `${NAVIGATION}@1.4.1`, `${FLEXBOX}@0.12.1`,
  ].sort());

  f.run('git-tag');
  assert.equal(readFileSync(f.output, 'utf8'), output);
});

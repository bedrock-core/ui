import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { resourcePackHash, releaseFile } from './resource-pack-policy.mjs';
import { syncPackVersion } from './sync-pack-version.mjs';
import { checkResourcePackRelease } from './check-resource-pack-release.mjs';

function fixture(t, uiVersion = '0.12.1') {
  const root = mkdtempSync(join(tmpdir(), 'core-asset-version-test-'));

  t.after(() => rmSync(root, { recursive: true, force: true }));

  const put = (file, value) => {
    const target = join(root, file);

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(value));
  };
  const read = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
  const pack = 'packages/resource-pack';

  put('package.json', { version: uiVersion });
  put(pack + '/package.json', { devDependencies: { '@bedrock-core/builder': '0.1.0' } });
  put(pack + '/config.json', { description: 'Textures', bedrockCore: { profiles: {
    build: { stages: { bundler: false }, export: { resourcePack: './build/RP' } },
    default: { export: { resourcePack: './development/RP' } },
  } } });
  put(pack + '/packs/RP/manifest.json', { header: { uuid: 'shared-assets', version: '1.12.0', min_engine_version: '1.26.50' } });
  put(pack + '/packs/RP/textures/fixture.json', { width: 16 });
  put(pack + '/packs/BP/manifest.json', { dependencies: [{ uuid: 'shared-assets', version: '1.11.0' }] });
  put(releaseFile, { uiVersion: '0.12.0', sourceHash: resourcePackHash(root) });

  return { root, put, read, pack, run: () => syncPackVersion(root) };
}

test('unchanged patches retain the asset, version and dependency', t => {
  const f = fixture(t);
  const previous = f.read(releaseFile);

  assert.deepEqual(f.run(), { uiVersion: '0.12.1', assetVersion: '0.12.0', packVersion: '1.12.0', release: false });
  f.put('package.json', { version: '0.12.2' });
  assert.equal(f.run().release, false);
  assert.deepEqual(f.read(releaseFile), previous);
  assert.equal(f.read(f.pack + '/packs/RP/manifest.json').header.version, '1.12.0');
  assert.equal(f.read(f.pack + '/packs/BP/manifest.json').dependencies[0].version, '1.12.0');
});

test('minor releases select a renamed pack even with identical assets', t => {
  const f = fixture(t, '0.13.0');
  const sourceHash = resourcePackHash(f.root);

  assert.equal(f.run().release, true);
  assert.deepEqual(f.read(releaseFile), { uiVersion: '0.13.0', sourceHash });
  assert.equal(f.read(f.pack + '/packs/RP/manifest.json').header.version, '1.13.0');
  assert.equal(f.read(f.pack + '/packs/BP/manifest.json').dependencies[0].version, '1.13.0');
});

test('changed patch assets get their own release and need a new version for later changes', t => {
  const f = fixture(t);

  f.put(f.pack + '/packs/RP/textures/fixture.json', { width: 32 });
  assert.equal(f.run().assetVersion, '0.12.1');
  assert.equal(f.read(f.pack + '/packs/RP/manifest.json').header.version, '1.12.1');
  f.put(f.pack + '/packs/RP/textures/fixture.json', { width: 64 });
  assert.throws(f.run, /Bump the UI release/);
  f.put('package.json', { version: '0.12.2' });
  assert.equal(f.run().assetVersion, '0.12.2');
});

test('a candidate can explicitly prepare an asset when its retained selection was not published', t => {
  const f = fixture(t);

  assert.equal(f.run().release, false);
  assert.equal(syncPackVersion(f.root, undefined, { newArtifact: true }).assetVersion, '0.12.1');
  assert.equal(syncPackVersion(f.root, undefined, { newArtifact: true }).packVersion, '1.12.1');
});

test('manifest labels and deployment destinations do not create asset changes', t => {
  const f = fixture(t);
  const original = resourcePackHash(f.root);
  const manifest = f.read(f.pack + '/packs/RP/manifest.json');

  manifest.header.version = '1.99.99';
  f.put(f.pack + '/packs/RP/manifest.json', manifest);
  const config = f.read(f.pack + '/config.json');

  config.bedrockCore.profiles.build.export.resourcePack = './other-output';
  config.bedrockCore.profiles.default.export.resourcePack = './other-development';
  f.put(f.pack + '/config.json', config);
  assert.equal(resourcePackHash(f.root), original);
});

test('Windows and CI text line endings select the same asset inputs', t => {
  const f = fixture(t);
  const text = join(f.root, f.pack, 'packs/RP/textures/fixture.json');

  writeFileSync(text, '{\r\n  "width": 16\r\n}\r\n');
  const windows = resourcePackHash(f.root);

  writeFileSync(text, '{\n  "width": 16\n}\n');
  assert.equal(resourcePackHash(f.root), windows);
});

for (const [name, change] of [
  ['texture bytes', f => f.put(f.pack + '/packs/RP/textures/fixture.json', { width: 64 })],
  ['new asset paths', f => f.put(f.pack + '/packs/RP/textures/extra.json', {})],
  ['removed assets', f => rmSync(join(f.root, f.pack, 'packs/RP/textures/fixture.json'))],
  ['manifest requirements', f => { const m=f.read(f.pack + '/packs/RP/manifest.json');m.header.min_engine_version='1.26.60';f.put(f.pack + '/packs/RP/manifest.json',m); }],
  ['build configuration', f => { const c=f.read(f.pack + '/config.json');c.bedrockCore.profiles.build.stages.generator=true;f.put(f.pack + '/config.json',c); }],
  ['build tooling', f => f.put(f.pack + '/package.json', { devDependencies: { '@bedrock-core/builder': '0.1.1' } })],
]) {
  test(name + ' require a new patch artifact', t => {
    const f = fixture(t);

    change(f);
    assert.equal(f.run().release, true);
    assert.equal(f.run().assetVersion, '0.12.1');
  });
}

test('major releases, prerelease counters and stable promotion select versioned assets', t => {
  const f = fixture(t, '1.0.0-rc.1');

  assert.equal(f.run().packVersion, '2.0.0-rc.1');
  f.put('package.json', { version: '1.0.0-rc.2' });
  assert.equal(f.run().packVersion, '2.0.0-rc.2');
  f.put('package.json', { version: '1.0.0' });
  assert.equal(f.run().packVersion, '2.0.0');
});

test('workflow outputs skip unchanged patches and enable minor artifact distribution', t => {
  const f = fixture(t);
  const output = join(f.root, 'github-output');
  const script = fileURLToPath(new URL('./check-resource-pack-release.mjs', import.meta.url));
  const decision = version => {
    writeFileSync(output, '');
    execFileSync(process.execPath, [script, version, f.root], { env: { ...process.env, GITHUB_OUTPUT: output } });

    return Object.fromEntries(readFileSync(output, 'utf8').trim().split('\n').map(line => line.split('=')));
  };

  f.run();
  assert.deepEqual(decision('0.12.1'), { release: 'false', asset_version: '0.12.0', pack_version: '1.12.0' });
  f.put('package.json', { version: '0.13.0' });
  f.run();
  assert.deepEqual(decision('0.13.0'), { release: 'true', asset_version: '0.13.0', pack_version: '1.13.0' });
});

test('current release metadata matches the actual resource inputs', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const read = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
  const version = read('package.json').version;

  checkResourcePackRelease(version, version, read('packages/resource-pack/packs/RP/manifest.json').header.version,
    read(releaseFile), resourcePackHash(root));
});

test('CurseForge metadata uses the supplied artifact manifest', t => {
  const dir = mkdtempSync(join(tmpdir(), 'core-pack-upload-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const config = join(dir, 'packages/resource-pack/curseforge.json');
  mkdirSync(dirname(config), { recursive: true });
  writeFileSync(config, JSON.stringify({ projectId: 1, gameEndpoint: 'minecraft', releaseType: 'release' }));
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ header: { version: '1.12.2', min_engine_version: '1.26.50' } }));
  writeFileSync(join(dir, 'core-ui-0.12.2.mcpack'), 'dry-run fixture');
  writeFileSync(join(dir, 'notes.md'), 'Texture pack release.');

  const output = execFileSync(process.execPath, [
    fileURLToPath(new URL('./curseforge-upload.mjs', import.meta.url)),
    '--file', 'core-ui-0.12.2.mcpack', '--manifest', 'manifest.json',
    '--changelog-file', 'notes.md', '--tag', '@bedrock-core/ui@0.12.2', '--dry-run',
  ], { cwd: dir, encoding: 'utf8' });

  const metadata = JSON.parse(output.slice(output.indexOf('{')));
  assert.equal(metadata.displayName, 'core-ui-0.12.2.mcpack');
  assert.deepEqual(metadata.gameVersionNames, ['26.50']);
});

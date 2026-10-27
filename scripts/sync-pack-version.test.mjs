import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

test('texture pack follows UI releases even when textures are unchanged', t => {
  const dir = mkdtempSync(join(tmpdir(), 'core-asset-version-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const pack = 'packages/resource-pack';
  const put = (file, value) => {
    const target = join(dir, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(value));
  };
  const read = file => JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const run = (...args) => execFileSync(process.execPath, [fileURLToPath(new URL('./sync-pack-version.mjs', import.meta.url)), ...args], { cwd: dir });

  put('package.json', { version: '0.12.1' });
  put(`${pack}/packs/RP/manifest.json`, { header: { uuid: 'shared-assets', version: '1.12.0' } });
  put(`${pack}/packs/RP/textures/fixture.json`, { width: 16 });
  put(`${pack}/packs/BP/manifest.json`, { dependencies: [{ uuid: 'shared-assets', version: '1.12.0' }] });

  run();
  assert.equal(read(`${pack}/packs/RP/manifest.json`).header.version, '1.12.1');
  assert.equal(read(`${pack}/packs/BP/manifest.json`).dependencies[0].version, '1.12.1');
  run();
  assert.equal(read(`${pack}/packs/RP/manifest.json`).header.version, '1.12.1');

  put('package.json', { version: '0.12.2' });
  run();
  assert.equal(read(`${pack}/packs/RP/manifest.json`).header.version, '1.12.2');
  assert.equal(read(`${pack}/packs/BP/manifest.json`).dependencies[0].version, '1.12.2');

  put(`${pack}/packs/RP/textures/fixture.json`, { width: 32 });
  run();
  assert.equal(read(`${pack}/packs/RP/manifest.json`).header.version, '1.12.2');

  put(`${pack}/packs/BP/manifest.json`, { dependencies: [{ uuid: 'shared-assets', version: '1.12.0' }] });
  run();
  assert.equal(read(`${pack}/packs/BP/manifest.json`).dependencies[0].version, '1.12.2');

  put('package.json', { version: '0.13.0' });
  run();
  assert.equal(read(`${pack}/packs/RP/manifest.json`).header.version, '1.13.0');
  assert.equal(read(`${pack}/packs/BP/manifest.json`).dependencies[0].version, '1.13.0');

  run('1.0.0-rc.1');
  assert.equal(read(`${pack}/packs/RP/manifest.json`).header.version, '2.0.0-rc.1');
  assert.equal(read(`${pack}/packs/BP/manifest.json`).dependencies[0].version, '2.0.0-rc.1');
  assert.equal(read('package.json').version, '0.13.0');
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

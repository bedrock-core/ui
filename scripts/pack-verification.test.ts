import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { comparePackContents } from './pack-verification.ts';

const packs = (t: TestContext): { built: string; deployed: string } => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-pack-verification-'));

  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const built = path.join(root, 'built');
  const deployed = path.join(root, 'deployed');

  for (const directory of [built, deployed]) {
    fs.mkdirSync(path.join(directory, 'textures'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'manifest.json'), '{"header":{"name":"Shared textures"}}');
    fs.writeFileSync(path.join(directory, 'textures', 'field.png'), Buffer.from([137, 80, 78, 71]));
  }

  return { built, deployed };
};

test('verifies a texture-only resource pack without a compiler stamp', (t) => {
  const { built, deployed } = packs(t);
  const comparison = comparePackContents(built, deployed);

  assert.equal(comparison.files, 2);
  assert.deepEqual(comparison.missing, []);
  assert.deepEqual(comparison.changed, []);
  assert.deepEqual(comparison.extra, []);
});

test('detects changed texture bytes even when file length is unchanged', (t) => {
  const { built, deployed } = packs(t);

  fs.writeFileSync(path.join(deployed, 'textures', 'field.png'), Buffer.from([137, 80, 78, 72]));
  assert.deepEqual(comparePackContents(built, deployed).changed, ['textures/field.png']);
});

test('detects missing assets and stale files outside the current build', (t) => {
  const { built, deployed } = packs(t);

  fs.unlinkSync(path.join(deployed, 'textures', 'field.png'));
  fs.writeFileSync(path.join(deployed, 'textures', 'stale.png'), 'stale');
  const comparison = comparePackContents(built, deployed);

  assert.deepEqual(comparison.missing, ['textures/field.png']);
  assert.deepEqual(comparison.extra, ['textures/stale.png']);
});

test('rejects a build with no manifest', (t) => {
  const { built, deployed } = packs(t);

  fs.unlinkSync(path.join(built, 'manifest.json'));
  assert.throws(() => comparePackContents(built, deployed), /no manifest\.json/);
});

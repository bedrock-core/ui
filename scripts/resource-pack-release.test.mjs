import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkResourcePackRelease, verifyRetainedResourcePack } from './check-resource-pack-release.mjs';

const sourceHash = 'a'.repeat(64);
const selected = uiVersion => ({ uiVersion, sourceHash });

test('new asset releases require the exact tagged candidate and selected manifest', () => {
  assert.deepEqual(checkResourcePackRelease('0.13.0', '0.13.0', '1.13.0', selected('0.13.0'), sourceHash),
    { release: true, assetVersion: '0.13.0', packVersion: '1.13.0' });
  assert.throws(() => checkResourcePackRelease('0.12.1', '0.13.0', '1.13.0', selected('0.13.0'), sourceHash), /source UI version/);
  assert.throws(() => checkResourcePackRelease('0.13.0', '0.13.0', '1.12.1', selected('0.13.0'), sourceHash), /tagged resource-pack/);
});

test('unchanged library patches select the existing artifact and skip distribution', () => {
  assert.deepEqual(checkResourcePackRelease('0.13.2', '0.13.2', '1.13.0', selected('0.13.0'), sourceHash),
    { release: false, assetVersion: '0.13.0', packVersion: '1.13.0' });
});

test('patches with selected changed assets own a new artifact', () => {
  assert.equal(checkResourcePackRelease('0.13.2', '0.13.2', '1.13.2', selected('0.13.2'), sourceHash).release, true);
});

test('stale minor, changed-input and rollback selections fail before a build', () => {
  assert.throws(() => checkResourcePackRelease('0.14.0', '0.14.0', '1.13.0', selected('0.13.0'), sourceHash), /stale/);
  assert.throws(() => checkResourcePackRelease('0.13.2', '0.13.2', '1.13.0', selected('0.13.0'), 'b'.repeat(64)), /stale/);
  assert.throws(() => checkResourcePackRelease('0.13.0', '0.13.0', '1.13.1', selected('0.13.1'), sourceHash), /cannot precede/);
});

test('resource-pack release validation preserves prerelease and build metadata', () => {
  assert.equal(checkResourcePackRelease('1.2.3-beta.4+abc', '1.2.3-beta.4+abc', '2.2.3-beta.4+abc', selected('1.2.3-beta.4+abc'), sourceHash).packVersion, '2.2.3-beta.4+abc');
  assert.throws(() => checkResourcePackRelease('latest', 'latest', '1.0.0', selected('0.0.0'), sourceHash), /exact release/);
});

test('new assets need no existing download; retained assets must already exist', () => {
  const fresh = { release: true, assetVersion: '0.13.0' };

  verifyRetainedResourcePack(fresh, 'bedrock-core/ui', () => { throw new Error('New artifacts must not be looked up'); });
  const reused = { release: false, assetVersion: '0.13.0' };
  const run = (_command, args) => {
    assert.deepEqual(args, ['release', 'view', '@bedrock-core/ui@0.13.0', '--repo', 'bedrock-core/ui', '--json', 'assets']);

    return JSON.stringify({ assets: [{ name: 'core-ui-0.13.0.mcpack', size: 123 }] });
  };

  verifyRetainedResourcePack(reused, 'bedrock-core/ui', run);
  assert.throws(() => verifyRetainedResourcePack(reused, 'bedrock-core/ui', () => '{"assets":[]}'), /unavailable/);
});

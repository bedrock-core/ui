import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkResourcePackRelease } from './check-resource-pack-release.mjs';

test('release assets require the exact tagged UI and matching pack version', () => {
  assert.equal(checkResourcePackRelease('0.13.0', '0.13.0', '1.13.0'), '1.13.0');
  assert.throws(() => checkResourcePackRelease('0.12.1', '0.13.0', '1.13.0'), /source UI version/);
  assert.throws(() => checkResourcePackRelease('0.13.0', '0.13.0', '1.12.1'), /tagged resource-pack/);
});

test('resource-pack release validation preserves prerelease and build metadata', () => {
  assert.equal(checkResourcePackRelease('1.2.3-beta.4+abc', '1.2.3-beta.4+abc', '2.2.3-beta.4+abc'), '2.2.3-beta.4+abc');
  assert.throws(() => checkResourcePackRelease('latest', 'latest', '1.0.0'), /exact UI release/);
});

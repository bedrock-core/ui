import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureRootRelease, rootReleaseTag } from './release-root.mjs';

test('root release uses the exact package tag and creates only when absent', () => {
	const calls = [];
	const run = (args, options) => {
		calls.push({ args, options });

		return calls.length === 1 ? { ok: false } : { ok: true };
	};

	const result = ensureRootRelease({
		manifest: { name: '@bedrock-core/ui', version: '0.12.2' },
		env: { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'bedrock-core/ui', GITHUB_SHA: 'abc123' },
		run,
	});

	assert.deepEqual(result, { tag: '@bedrock-core/ui@0.12.2', created: true });
	assert.deepEqual(calls.map(({ args }) => args), [
		['release', 'view', '@bedrock-core/ui@0.12.2', '--repo', 'bedrock-core/ui', '--json', 'tagName'],
		['release', 'create', '@bedrock-core/ui@0.12.2', '--repo', 'bedrock-core/ui', '--target', 'abc123', '--title', '@bedrock-core/ui@0.12.2', '--generate-notes'],
	]);
});

test('existing root releases are left untouched', () => {
	const calls = [];
	const result = ensureRootRelease({
		manifest: { name: '@bedrock-core/ui', version: '0.12.2' },
		env: { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'bedrock-core/ui' },
		run: (args) => { calls.push(args); return { ok: true }; },
	});

	assert.deepEqual(result, { tag: '@bedrock-core/ui@0.12.2', created: false });
	assert.equal(calls.length, 1);
});

test('root release rejects a different package or unreleased placeholder', () => {
	assert.throws(() => rootReleaseTag({ name: '@bedrock-core/ui-runtime', version: '0.12.2' }), /Root release/);
	assert.throws(() => rootReleaseTag({ name: '@bedrock-core/ui', version: '0.0.0' }), /Root release/);
});

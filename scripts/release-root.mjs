#!/usr/bin/env node
/**
 * Ensure the repository-root @bedrock-core/ui package has the GitHub release
 * that the render-pack and downstream CLI workflows consume.
 *
 * Changesets inventories child workspaces only, so tag-packages deliberately
 * does not report the root package through CHANGESETS_OUTPUT. The libraries
 * publish workflow calls this helper after the Changesets action has published
 * the children and their releases.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function rootReleaseTag(manifest) {
	if (manifest?.name !== '@bedrock-core/ui' || typeof manifest.version !== 'string' || manifest.version === '0.0.0') {
		throw new Error('Root release requires a released @bedrock-core/ui package manifest.');
	}

	return `${manifest.name}@${manifest.version}`;
}

export function ensureRootRelease({ manifest, env = process.env, run = runGh }) {
	const tag = rootReleaseTag(manifest);
	const repository = env.GITHUB_REPOSITORY;

	if (env.GITHUB_ACTIONS !== 'true') {
		throw new Error('Root release is restricted to the GitHub Actions publish workflow.');
	}

	if (!repository) {
		throw new Error('Root release requires GITHUB_REPOSITORY.');
	}

	const view = run(['release', 'view', tag, '--repo', repository, '--json', 'tagName'], { allowFailure: true });

	if (view.ok) {
		return { tag, created: false };
	}

	run([
		'release', 'create', tag,
		'--repo', repository,
		'--target', env.GITHUB_SHA || 'HEAD',
		'--title', tag,
		'--generate-notes',
	]);

	return { tag, created: true };
}

function runGh(args, { allowFailure = false } = {}) {
	try {
		const output = execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

		return { ok: true, output };
	} catch (error) {
		if (allowFailure) return { ok: false, output: error instanceof Error ? error.message : String(error) };

		throw error;
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
	const result = ensureRootRelease({ manifest });
	console.log(`${result.created ? 'created' : 'found'} GitHub release ${result.tag}`);
}

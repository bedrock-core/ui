#!/usr/bin/env node
/**
 * Upload the release's `.mcpack` to the CurseForge project.
 *
 * CurseForge's author API can create files and set their changelog, and nothing
 * else — there is no endpoint for the project's description page. So the page is
 * written once as evergreen text pointing at the docs and the latest release,
 * and the only thing that moves per release is the file plus its changelog,
 * which is what this script uploads.
 *
 * The `.mcpack` is taken from the GitHub release rather than rebuilt: the pack
 * attached to the release IS the artifact users get, and re-zipping it here
 * would mean a second build that could disagree with it.
 *
 * Usage:
 *   node scripts/curseforge-upload.mjs --file <mcpack> --changelog-file <md> --tag <tag> [--dry-run]
 *
 * Reads `CURSEFORGE_TOKEN` from the environment (not needed for --dry-run).
 */
import { basename } from 'node:path';
import { readFileSync } from 'node:fs';

const CONFIG = 'packages/resource-pack/curseforge.json';
const RECORD = 'packages/resource-pack/protocol.json';
const MANIFEST = 'packages/resource-pack/packs/RP/manifest.json';

function fail(message) {
	console.error(`curseforge-upload: ${message}`);
	process.exit(1);
}

/** `--file x --tag y --dry-run` → `{ file: 'x', tag: 'y', 'dry-run': true }` */
function parseArgs(argv) {
	const out = {};

	for (let i = 0; i < argv.length; i++) {
		if (!argv[i].startsWith('--')) { continue; }

		const key = argv[i].slice(2);
		const next = argv[i + 1];

		if (next === undefined || next.startsWith('--')) { out[key] = true; }
		else { out[key] = next; i++; }
	}

	return out;
}

const args = parseArgs(process.argv.slice(2));
const dryRun = args['dry-run'] === true;

for (const required of ['file', 'changelog-file', 'tag']) {
	if (typeof args[required] !== 'string') { fail(`missing --${required}`); }
}

const token = process.env.CURSEFORGE_TOKEN;

if (!token && !dryRun) { fail('CURSEFORGE_TOKEN is not set'); }

const config = JSON.parse(readFileSync(CONFIG, 'utf8'));

if (!config.projectId) {
	fail(`"projectId" is not set in ${CONFIG} — take the numeric id from the CurseForge project URL`);
}

if (!['alpha', 'beta', 'release'].includes(config.releaseType)) {
	fail(`"releaseType" in ${CONFIG} must be "alpha", "beta" or "release"`);
}

const { packVersion } = JSON.parse(readFileSync(RECORD, 'utf8'));
const displayName = `Core UI ${packVersion.join('.')}`;
const base = `https://${config.gameEndpoint}.curseforge.com/api`;
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const minimumEngine = manifest.header?.min_engine_version;

if (typeof minimumEngine !== 'string' || !/^1\.\d+\.\d+$/.test(minimumEngine)) {
	fail(`${MANIFEST} header.min_engine_version must be a Bedrock version such as "1.26.50"`);
}

// CurseForge displays current Bedrock releases without Minecraft's leading
// `1.` (manifest 1.26.50 is CurseForge 26.50). Extra names can be declared for
// a compatibility range, but the pack's actual minimum is always included.
const gameVersionNames = [...new Set([
	...(Array.isArray(config.gameVersionNames) ? config.gameVersionNames : []),
	minimumEngine.slice(2),
])];
const metadata = {
	changelog: readFileSync(args['changelog-file'], 'utf8'),
	changelogType: 'markdown',
	displayName,
	gameVersionNames,
	releaseType: config.releaseType,
};
const pack = readFileSync(args.file);

if (dryRun) {
	console.log(`curseforge-upload: DRY RUN — would POST ${basename(args.file)} (${pack.length} bytes)`);
	console.log(`  → ${base}/projects/${config.projectId}/upload-file`);
	console.log(JSON.stringify(metadata, null, '\t'));
	process.exit(0);
}

const form = new FormData();

form.append('metadata', JSON.stringify(metadata));
form.append('file', new Blob([pack]), basename(args.file));

const upload = await fetch(`${base}/projects/${config.projectId}/upload-file`, {
	method: 'POST',
	headers: { Accept: 'application/json', 'X-Api-Token': token },
	body: form,
});
const body = await upload.text();

if (!upload.ok) { fail(`upload-file → ${upload.status} ${upload.statusText}\n${body}`); }

let id;

try {
	({ id } = JSON.parse(body));
} catch {
	fail(`upload-file returned invalid JSON\n${body}`);
}

if (!Number.isInteger(id)) { fail(`upload-file response has no numeric file id\n${body}`); }

const projectSettingsUrl = `https://authors.curseforge.com/#/projects/${config.projectId}/general`;

console.log(`curseforge-upload: ${displayName} uploaded from ${args.tag} — file ${id}`);

if (process.env.GITHUB_STEP_SUMMARY) {
	const { appendFileSync } = await import('node:fs');

	appendFileSync(
		process.env.GITHUB_STEP_SUMMARY,
		`### CurseForge\n\n\`${displayName}\` uploaded as file \`${id}\` from \`${args.tag}\` — [project settings](${projectSettingsUrl}).\n`,
	);
}

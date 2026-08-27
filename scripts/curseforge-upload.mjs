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
 * Reads `CURSEFORGE_TOKEN` from the environment (not needed for --dry-run
 * unless the game versions still have to be resolved).
 */
import { basename } from 'node:path';
import { readFileSync } from 'node:fs';

const CONFIG = 'packages/resource-pack/curseforge.json';
const RECORD = 'packages/resource-pack/protocol.json';

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

if (!Array.isArray(config.gameVersionSlugs) || config.gameVersionSlugs.length === 0) {
	fail(`"gameVersionSlugs" in ${CONFIG} is empty — CurseForge rejects a file with no game version`);
}

const { packVersion } = JSON.parse(readFileSync(RECORD, 'utf8'));
const displayName = `Core UI ${packVersion.join('.')}`;
const base = `https://${config.gameEndpoint}.curseforge.com/api`;

/**
 * Resolve the configured slugs to the numeric ids the upload expects.
 *
 * An unresolved slug is fatal on purpose: CurseForge would happily take the
 * upload with whatever ids did resolve, and the file would land tagged for the
 * wrong Minecraft versions — silently, and only visible on the public page.
 * A red build is the cheaper failure.
 */
async function resolveGameVersions() {
	const response = await fetch(`${base}/game/versions`, { headers: { 'X-Api-Token': token } });

	if (!response.ok) {
		fail(`GET /game/versions → ${response.status} ${response.statusText}\n${await response.text()}`);
	}

	const versions = await response.json();
	const bySlug = new Map(versions.map((version) => [version.slug, version]));
	const ids = [];
	const missing = [];

	for (const slug of config.gameVersionSlugs) {
		const version = bySlug.get(slug);

		if (version) { ids.push(version.id); }
		else { missing.push(slug); }
	}

	if (missing.length > 0) {
		// CurseForge returns every version of every type — thousands of rows,
		// mostly Java. Narrow to the type the slugs that DID resolve belong to;
		// when none resolved, sample each type so the right one is pickable.
		const types = new Set(ids.map((id) => versions.find((v) => v.id === id).gameVersionTypeID));
		const grouped = new Map();

		for (const version of versions) {
			if (types.size > 0 && !types.has(version.gameVersionTypeID)) { continue; }

			const slugs = grouped.get(version.gameVersionTypeID) ?? [];

			slugs.push(version.slug);
			grouped.set(version.gameVersionTypeID, slugs);
		}

		const hint = [...grouped]
			.map(([type, slugs]) => {
				const sorted = slugs.sort();
				const shown = types.size > 0 ? sorted : sorted.slice(0, 8);
				const more = sorted.length - shown.length;

				return `  type ${type}: ${shown.join(', ')}${more > 0 ? ` … (+${more})` : ''}`;
			})
			.join('\n');

		fail(`unknown game version slug(s) in ${CONFIG}: ${missing.join(', ')}\nknown slugs:\n${hint}`);
	}

	return ids;
}

const gameVersions = token ? await resolveGameVersions() : [];
const metadata = {
	changelog: readFileSync(args['changelog-file'], 'utf8'),
	changelogType: 'markdown',
	displayName,
	gameVersions,
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
	headers: { 'X-Api-Token': token },
	body: form,
});
const body = await upload.text();

if (!upload.ok) { fail(`upload-file → ${upload.status} ${upload.statusText}\n${body}`); }

const { id } = JSON.parse(body);
// The public file URL is keyed by the project SLUG, which the API never returns;
// /projects/<id> is the id-addressable redirect CurseForge does expose.
const url = `https://www.curseforge.com/projects/${config.projectId}`;

console.log(`curseforge-upload: ${displayName} uploaded from ${args.tag} — file ${id}`);

if (process.env.GITHUB_STEP_SUMMARY) {
	const { appendFileSync } = await import('node:fs');

	appendFileSync(
		process.env.GITHUB_STEP_SUMMARY,
		`### CurseForge\n\n\`${displayName}\` uploaded as file \`${id}\` from \`${args.tag}\` — [project](${url}).\n`,
	);
}

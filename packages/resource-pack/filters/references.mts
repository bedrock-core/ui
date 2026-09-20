// The framework's screens, reduced to references.
//
// The framework has no realm: nothing calls `core.register()` for it, so the
// screens it owns — its guide and its page in the catalog — cannot be
// published the way an addon publishes its own. They are baked into this
// pack instead, and what presenting them needs (each screen's title, the
// values its entries are shown with, where every press leads) is emitted
// here as data that `@bedrock-core/catalog` ships, so every realm shows them
// from the render pack the client already has, none of this pack's script
// involved.
//
// Runs after ui-compiler, which wrote the registration module this reads, and
// before the bundler. The references are built by the same library the
// screens were compiled against, in the same way an addon builds its own at
// startup. The result stays in the artifact project's cache. `sync-framework`
// copies it into Apps before Catalog is released; the artifact workflow later
// verifies it against the copy installed from npm.

import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { build, type Plugin } from 'esbuild';

const projectRoot = process.env['ROOT_DIR'];

if (!projectRoot) {
  console.error('❌ references: ROOT_DIR environment variable not set — this filter must be run by Regolith');
  process.exit(1);
}

/** The namespace this pack's screens are compiled under; the page's marker names it. */
const NAMESPACE = 'core';
const REGISTRATION = 'data/ui/ui.generated.ts';
const I18N_BUNDLE = 'data/i18n/i18n.generated.json';
const GUIDES_BUNDLE = 'data/guides/guides.generated.json';
const PAGE = 'BP/scripts/screens/framework.screen.tsx';
const MANIFEST = 'RP/manifest.json';
const OUTPUT = path.resolve(projectRoot, '.regolith', 'cache', 'references', 'framework.generated.ts');

/** Every runtime export declared by a Minecraft type-only package. */
function gameExports(specifier: string, from: string): string[] {
  try {
    const manifest = createRequire(path.join(from, 'resolve.cjs')).resolve(`${specifier}/package.json`);
    const declarations = fs.readFileSync(path.join(path.dirname(manifest), 'index.d.ts'), 'utf-8');
    const names = new Set<string>();
    const declared = /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|const|let|var|function|enum|interface|type)\s+([A-Za-z_$][\w$]*)/gm;

    for (const match of declarations.matchAll(declared)) {
      if (match[1] !== undefined) names.add(match[1]);
    }

    return [...names];
  } catch {
    return [];
  }
}

/** Replaces Minecraft's type-only packages while evaluating pure build-time UI code. */
function gameStubPlugin(from: string): Plugin {
  const anything = [
    'const handler = {',
    "  get: (target, key) => key === '__esModule' ? true : typeof key === 'symbol' ? undefined : anything(),",
    '  apply: () => anything(),',
    '  construct: () => anything(),',
    '};',
    'const anything = () => new Proxy(function stub() {}, handler);',
  ].join('\n');

  return {
    name: 'minecraft-stub',
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^@minecraft\/server(-ui|-net|-admin)?$/ }, args => ({
        path: args.path,
        namespace: 'minecraft-stub',
      }));
      pluginBuild.onLoad({ filter: /.*/, namespace: 'minecraft-stub' }, args => ({
        contents: [
          anything,
          ...gameExports(args.path, from).map(name => `export const ${name} = anything();`),
          'export default anything();',
        ].join('\n'),
        loader: 'js',
        resolveDir: from,
      }));
    },
  };
}

/** Bundle and execute the reference entry against this artifact project's npm dependencies. */
async function evaluateEntry<T>(contents: string): Promise<T> {
  const result = await build({
    stdin: {
      contents,
      resolveDir: process.cwd(),
      sourcefile: 'references.entry.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    alias: Object.fromEntries(
      [['@bedrock-core/generated/i18n', I18N_BUNDLE], ['@bedrock-core/generated/guides', GUIDES_BUNDLE]]
        .filter(([, file]) => fs.existsSync(file as string))
        .map(([specifier, file]) => [specifier, path.resolve(file as string)]),
    ),
    plugins: [gameStubPlugin(process.cwd())],
    write: false,
    logLevel: 'silent',
  });
  const [output] = result.outputFiles;

  if (output === undefined) throw new Error('esbuild produced no reference bundle');

  const cacheDir = path.join(projectRoot, '.regolith', 'cache', 'references');
  const hash = crypto.createHash('sha1').update(output.text).digest('hex').slice(0, 16);
  const file = path.join(cacheDir, `${hash}.mjs`);

  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(file, output.text, 'utf-8');

  const mod = await import(pathToFileURL(file).href) as { default: T };

  return mod.default;
}

for (const required of [REGISTRATION, I18N_BUNDLE, PAGE, MANIFEST]) {
  if (!fs.existsSync(required)) {
    console.error(`❌ references: ${required} is missing — the filters before this one did not write it`);
    process.exit(1);
  }
}

interface References {
  screens: { v: 1; ns: string; screens: Record<string, unknown> };
  page: { v: 1; values: string[]; targets: (string | null)[] };
}

// Everything in one bundle, so the screens the registration module registers
// are the ones the references are read from.
const entry = `
import i18nBundle from ${JSON.stringify(path.resolve(I18N_BUNDLE))};
import { createI18n } from '@bedrock-core/i18n';

createI18n(i18nBundle);

import ${JSON.stringify(path.resolve(REGISTRATION))};
import { addonReference } from '@bedrock-core/ui';
import { addonPageReference } from '@bedrock-core/navigation';
import Page from ${JSON.stringify(path.resolve(PAGE))};

export default {
  screens: addonReference(${JSON.stringify(NAMESPACE)}),
  page: addonPageReference(Page),
};
`;

const references = await evaluateEntry<References>(entry).catch((error: unknown) => {
  console.error(`❌ references: ${String(error instanceof Error ? error.message : error)}`);

  return process.exit(1);
});

// The framework's version is the render pack's: the pack is what draws the page and what a player
// has installed, so the catalog row and the page show the one number.
const frameworkVersion: unknown = (JSON.parse(fs.readFileSync(MANIFEST, 'utf-8')) as { header?: { version?: unknown } }).header?.version;

if (typeof frameworkVersion !== 'string') {
  console.error(`❌ references: ${MANIFEST} has no header.version string`);
  process.exit(1);
}

if (Object.keys(references.screens.screens).length === 0) {
  console.error(`❌ references: no compiled screens under "${NAMESPACE}" were registered — did ui-compiler run?`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(
  OUTPUT,
  [
    '// GENERATED by the render pack\'s references filter — do not edit.',
    '//',
    '// The framework\'s own screens, baked into the render pack, as what',
    '// presenting them needs: a title per screen, the values its entries are',
    '// shown with, and where each press leads. Nothing registers the framework,',
    '// so no realm can publish these the way an addon publishes its page and',
    '// guide; every realm carries them here instead and shows them from the',
    '// pack the client already has.',
    '',
    "import type { AddonReference } from '@bedrock-core/ui-runtime';",
    'import type { AddonPageReference } from \'@bedrock-core/navigation\';',
    '',
    '/** The namespace the framework\'s screens are compiled under: what its page\'s marker names. */',
    `export const FRAMEWORK_NAMESPACE = ${JSON.stringify(NAMESPACE)};`,
    '',
    '/** Every static screen the render pack compiled, by the key it is navigated with. */',
    `export const FRAMEWORK_SCREENS: AddonReference = ${JSON.stringify(references.screens, null, 2)};`,
    '',
    `export const FRAMEWORK_PAGE: AddonPageReference = ${JSON.stringify(references.page, null, 2)};`,
    '',
    "/** The render pack's version: what the framework's row and page both show. */",
    `export const FRAMEWORK_VERSION = ${JSON.stringify(frameworkVersion)};`,
    '',
  ].join('\n'),
  'utf-8',
);

console.log(`✅ references: ${String(Object.keys(references.screens.screens).length)} framework screen(s) and the page → ${path.relative(projectRoot, OUTPUT).split(path.sep).join('/')}`);

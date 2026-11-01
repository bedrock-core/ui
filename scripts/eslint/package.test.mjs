import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../', import.meta.url));

test('the packed UI exposes typed hook linting to an isolated consumer', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'core-ui-eslint-package-'));

  t.after(() => rmSync(directory, { recursive: true, force: true }));

  const yarn = process.env.COREPACK_ROOT ? path.join(process.env.COREPACK_ROOT, 'dist/yarn.js') : process.env.npm_execpath;

  assert.ok(yarn && /yarn[^/\\]*\.(?:c?js)$/.test(yarn), 'Run this package acceptance test with yarn test:lint.');

  const archive = path.join(directory, 'ui.tgz');

  execFileSync(process.execPath, [yarn, 'pack', '--out', archive], { cwd: repository, stdio: 'pipe' });

  const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split(/\r?\n/);

  for (const file of ['index.mjs', 'core-hooks.mjs', 'react-hooks.mjs', 'index.d.ts']) {
    assert.ok(entries.includes('package/eslint/' + file), file + ' must ship');
  }

  assert.ok(entries.every(file => file.startsWith('package/') && !file.split('/').includes('..')));
  assert.ok(entries.every(file => !file.startsWith('package/scripts/') && !file.endsWith('.test.mjs')));
  execFileSync('tar', ['-xzf', archive, '-C', directory]);

  const consumer = path.join(directory, 'consumer');
  const modules = path.join(consumer, 'node_modules');
  const installed = path.join(modules, '@bedrock-core/ui');

  mkdirSync(path.dirname(installed), { recursive: true });
  renameSync(path.join(directory, 'package'), installed);

  const manifest = JSON.parse(readFileSync(path.join(installed, 'package.json'), 'utf8'));

  assert.deepEqual(manifest.exports['./eslint'], { types: './eslint/index.d.ts', import: './eslint/index.mjs' });
  assert.equal(manifest.peerDependencies['eslint-plugin-react-hooks'], '7.1.1');

  for (const name of ['eslint', 'eslint-plugin-react-hooks']) {
    assert.equal(manifest.peerDependenciesMeta[name].optional, true);
    assert.equal(manifest.dependencies[name], undefined);
  }

  assert.ok(manifest.dependencies['@bedrock-core/ui-runtime']);
  assert.ok(!manifest.dependencies['@bedrock-core/ui-runtime'].startsWith('workspace:'));

  // Provide only the declared lint peers, the configured parser, and the runtime
  // dependency. Source helpers must resolve from the archive, not the checkout.
  for (const name of ['eslint', 'eslint-plugin-react-hooks', 'typescript-eslint', '@bedrock-core/ui-runtime']) {
    const target = path.join(modules, name);

    mkdirSync(path.dirname(target), { recursive: true });
    symlinkSync(realpathSync(path.join(repository, 'node_modules', name)), target, process.platform === 'win32' ? 'junction' : 'dir');
  }

  writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ name: 'core-lint-consumer', private: true, type: 'module' }));
  writeFileSync(path.join(consumer, 'eslint.config.mjs'), `
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import coreHooks from '@bedrock-core/ui/eslint';
export default defineConfig([...tseslint.configs.recommended, coreHooks.configs.recommended]);
`);
  writeFileSync(path.join(consumer, 'verify.mjs'), `
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import coreHooks, { ruleCoverage } from '@bedrock-core/ui/eslint';
assert.equal(Object.keys(coreHooks.rules).length, 10);
assert.equal(Object.keys(ruleCoverage).length, 17);
const eslint = new ESLint();
const [bad] = await eslint.lintText("import {useState as state,useEffect} from '@bedrock-core/ui'; function View(props){const [value,setValue]=state(0); useEffect(() => props.notify(value), []); setValue(1); return <Text/>;}", {filePath:'bad.tsx'});
for (const name of ['exhaustive-deps','set-state-in-render']) assert.ok(bad.messages.some(message=>message.ruleId==='core-hooks/'+name), JSON.stringify(bad.messages));
const [good] = await eslint.lintText("import {useRef} from '@bedrock-core/ui'; export function View(props){const ref=useRef(0);ref.current=props.value;return <Text/>;}", {filePath:'good.tsx'});
assert.deepEqual(good.messages.filter(message=>message.ruleId?.startsWith('core-hooks/')), []);
console.log('packed Core lint consumer passed');
`);

  assert.match(execFileSync(process.execPath, ['verify.mjs'], {
    cwd: consumer, env: { ...process.env, NODE_PATH: '' }, encoding: 'utf8',
  }), /packed Core lint consumer passed/);

  writeFileSync(path.join(consumer, 'eslint.config.ts'), `
import type { Linter } from 'eslint';
import coreHooks, { ruleCoverage } from '@bedrock-core/ui/eslint';
const config: Linter.Config = coreHooks.configs.recommended;
const reason: string = ruleCoverage.refs.reason;
export { config, reason };
`);
  writeFileSync(path.join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { noEmit: true, skipLibCheck: true, module: 'nodenext', target: 'es2022', types: [] },
    include: ['eslint.config.ts'],
  }));
  execFileSync(process.execPath, [path.join(repository, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], {
    cwd: consumer, encoding: 'utf8', stdio: 'pipe',
  });
});

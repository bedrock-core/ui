import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

function fixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'ui-clean-'));
  const root = path.join(directory, 'ui');
  const caller = path.join(directory, 'caller');
  const external = path.join(directory, 'external');
  const put = (file, value = 'keep') => {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, value);
  };

  mkdirSync(caller);
  mkdirSync(external);
  put(path.join(root, 'scripts', 'clean.mjs'));
  copyFileSync(new URL('./clean.mjs', import.meta.url), path.join(root, 'scripts', 'clean.mjs'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    rmSync(directory, { recursive: true, force: true });
  });

  return { root, caller, external, put, run: () => execFileSync(process.execPath, [path.join(root, 'scripts', 'clean.mjs')], { cwd: caller, encoding: 'utf8' }) };
}

test('clean removes regenerable directories throughout its own repository and preserves sources and Git data', t => {
  const { root, caller, put, run } = fixture(t);
  const disposable = ['node_modules', 'dist', 'build', 'coverage', '.cache', '.bds', '.bedrock-core'];

  for (const name of disposable) {
    put(path.join(root, name, 'output'));
    put(path.join(root, 'packages', 'fixture', name, 'output'));
  }

  const preserved = [path.join(root, 'src', 'main.ts'), path.join(root, 'package.json'), path.join(root, '.git', 'build', 'index'), path.join(caller, '.bedrock-core', 'output')];

  for (const file of preserved) put(file);

  assert.match(run(), /14 paths removed/);
  for (const name of disposable) {
    assert.equal(existsSync(path.join(root, name)), false);
    assert.equal(existsSync(path.join(root, 'packages', 'fixture', name)), false);
  }

  for (const file of preserved) assert.equal(readFileSync(file, 'utf8'), 'keep');

  assert.match(run(), /nothing to remove/);
});

test('clean skips directory links and never follows links inside discarded caches', t => {
  const { root, external, put, run } = fixture(t);
  const kind = process.platform === 'win32' ? 'junction' : 'dir';
  const marker = path.join(external, '.bds', 'bedrock_server.exe');

  put(marker);
  symlinkSync(external, path.join(root, 'linked-project'), kind);
  symlinkSync(external, path.join(root, 'node_modules'), kind);
  mkdirSync(path.join(root, 'build'));
  symlinkSync(external, path.join(root, 'build', 'linked-project'), kind);
  assert.match(run(), /1 path removed/);
  assert.equal(existsSync(path.join(root, 'build')), false);
  assert.equal(lstatSync(path.join(root, 'linked-project')).isSymbolicLink(), true);
  assert.equal(lstatSync(path.join(root, 'node_modules')).isSymbolicLink(), true);
  assert.equal(readFileSync(marker, 'utf8'), 'keep');
});

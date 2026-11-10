import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const generator = fileURLToPath(new URL('./generate-font-metrics.mjs', import.meta.url));

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'ui-font-metrics-'));

  t.after(async () => {
    assert.equal(path.dirname(path.resolve(root)), path.resolve(tmpdir()));
    await rm(root, { recursive: true, force: true });
  });

  return {
    root,
    run: (args, cwd = root) => spawnSync(process.execPath, [generator, ...args], { cwd, encoding: 'utf8' }),
  };
}

async function font(file, advanceWidth) {
  const value = new opentype.Font({
    familyName: 'Synthetic UI test font',
    styleName: 'Regular',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: [
      new opentype.Glyph({ name: '.notdef', advanceWidth: 500, path: new opentype.Path() }),
      new opentype.Glyph({ name: 'A', unicode: 65, advanceWidth, path: new opentype.Path() }),
    ],
  });

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(value.toArrayBuffer()));
}

function check(result) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
}

test('generates metrics from explicit relative font paths without a font list', async t => {
  const { root, run } = await fixture(t);

  await font(path.join(root, 'test fonts', 'mojangles.otf'), 700);
  await font(path.join(root, 'test fonts', 'minecraft-ten.otf'), 400);
  check(run(['--mojangles', 'test fonts/mojangles.otf', '--minecraftTen', 'test fonts/minecraft-ten.otf', '--output', 'out/metrics.json']));

  const metrics = JSON.parse(await readFile(path.join(root, 'out', 'metrics.json'), 'utf8'));

  assert.equal(metrics.profiles.mojangles.glyphWidths['65'], 7);
  assert.equal(metrics.profiles.minecraftTen.glyphWidths['65'], 4);
  assert.equal(metrics.profiles.mojangles.glyphWidths['66'], 6);
  assert.equal(metrics.profiles.mojangles.lineHeight, 10);
  assert.equal(metrics.profiles.minecraftTen.lineHeight, 12.4);
});

test('resolves list entries relative to the supplied list and allows explicit overrides', async t => {
  const { root, run } = await fixture(t);
  const source = path.join(root, 'inputs');
  const caller = path.join(root, 'caller');

  await font(path.join(source, 'fonts', 'mojangles.otf'), 700);
  await font(path.join(source, 'fonts', 'minecraft-ten.otf'), 400);
  await font(path.join(caller, 'override.otf'), 900);
  await writeFile(path.join(source, 'fonts.txt'), 'fonts/mojangles.otf\r\nfonts/minecraft-ten.otf\r\n');
  check(run(['--fonts', '../inputs/fonts.txt', '--mojangles', 'override.otf', '--output', 'metrics.json'], caller));

  const metrics = JSON.parse(await readFile(path.join(caller, 'metrics.json'), 'utf8'));

  assert.equal(metrics.profiles.mojangles.glyphWidths['65'], 9);
  assert.equal(metrics.profiles.minecraftTen.glyphWidths['65'], 4);
});

test('reports missing font paths, missing option values, and malformed lists', async t => {
  const { root, run } = await fixture(t);

  await writeFile(path.join(root, 'incomplete.txt'), 'one-font.otf\n');

  for (const [args, message] of [
    [[], /Missing font paths: mojangles, minecraftTen\. Provide --mojangles/],
    [['--mojangles', 'one-font.otf'], /Missing font paths: minecraftTen\. Provide --mojangles/],
    [['--fonts'], /Missing value for --fonts/],
    [['--fonts', 'incomplete.txt'], /Expected two font paths \(mojangles, minecraftTen\)/],
  ]) {
    const result = run([...args, '--output', 'unused.json']);

    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
  }

  await assert.rejects(readFile(path.join(root, 'unused.json')), { code: 'ENOENT' });
});

import assert from 'node:assert/strict';
import { describe, it, test } from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint, RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { exhaustiveDeps } from '../../eslint/core-hooks.mjs';

RuleTester.describe = describe;
RuleTester.it = it;

const prefix = "import { useEffect, useRef, useState, useReducer, useEvent } from '@bedrock-core/ui';\n";
const check = body => prefix + 'function View(value, source) { ' + body + ' }';
const missing = dependencies => ({ messageId: 'missing', data: { dependencies } });

new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 'latest', sourceType: 'module' },
}).run('core-hooks/exhaustive-deps', exhaustiveDeps, {
  valid: [
    check('useEffect(() => source.read(value));'),
    check('useEffect(() => source.read(value), undefined);'),
    check('useEffect(() => source.read(value), [source, value]);'),
    check('useEffect(() => source.read(value.id), [source, value]);'),
    check('useEffect(() => source.read(value?.id), [source, value.id]);'),
    check('useEffect(() => source.read(value.id), ([source, value.id] as const));'),
    check('const cache = useRef(value); useEffect(() => source.read(cache.current), [source]);'),
    "import { useEffect, useRenderOwner } from '@bedrock-core/ui-runtime'; function View() { const owner = useRenderOwner(); useEffect(() => owner.id, []); }",
    check('const label = "fixed"; useEffect(() => source.read(label), [source]);'),
    check('useEffect(() => { const local = value; return () => source.read(local); }, [source, value]);'),
    check('const callback = () => source.read(value); useEffect(callback, [source, value]);'),
    check('useEffect(source.callback, [source.callback]);'),
    check('useEffect(value, [value]);'),
    check('let callback = () => source.read(value); callback = source.callback; useEffect(callback, [callback]);'),
    check('useEvent(source, () => source.read(value), undefined, []);'),
    "import { useEffect } from 'another-library'; function View(value) { useEffect(() => value(), []); }",
    "const useEffect = () => {}; function View(value) { useEffect(() => value(), []); }",
    "import { useEffect } from '@bedrock-core/ui'; function View(useEffect, value) { useEffect(() => value(), []); }",
    "import { useEffect } from '@bedrock-core/ui'; const source = {}; function View() { useEffect(() => source.read(), []); }",
    "import * as Core from '@bedrock-core/ui-runtime'; function View(value) { const ref = Core.useRef(value); Core.useEffect(() => ref.current, []); }",
    "import { useRef as reference, useEffect as effect } from '@bedrock-core/ui-runtime'; function View(value) { const ref = reference(value); effect(() => ref.current, []); }",
    {
      filename: fileURLToPath(new URL('../../packages/ui-runtime/src/hooks/check.ts', import.meta.url)),
      code: "import { useEffect } from './useEffect'; function View(value) { useEffect(() => value(), [value]); }",
    },
    check('useEffect(() => { const local: typeof value = 1; source.read(local); }, [source]);'),
  ],
  invalid: [
    { code: check('useEffect(() => source.read(value), []);'), errors: [missing('source, value')] },
    { code: check('useEffect(() => source.read(value.id), [source]);'), errors: [missing('value.id')] },
    { code: check('useEffect(() => source.read(value.id), [source, value.other]);'), errors: [missing('value.id')] },
    { code: check('useEffect(() => () => source.read(value), [source]);'), errors: [missing('value')] },
    { code: check('useEffect(() => source[value](), [source]);'), errors: [missing('value')] },
    { code: check('const callback = () => source.read(value); useEffect(callback, [source]);'), errors: [missing('value')] },
    { code: check('useEffect(value, []);'), errors: [{ messageId: 'callback' }] },
    { code: check('let callback = () => value; callback = () => source; useEffect(callback, [value]);'), errors: [{ messageId: 'callback' }] },
    { code: check('function callback() { return value; } callback = () => source; useEffect(callback, [value]);'), errors: [{ messageId: 'callback' }] },
    {
      code: "import { useEffect } from '@bedrock-core/ui'; function View(undefined) { useEffect(() => {}, undefined); }",
      errors: [{ messageId: 'array' }],
    },
    { code: check('useEffect(() => source.read(value), source);'), errors: [{ messageId: 'array' }] },
    { code: check('useEffect(() => source.read(value), [...source]);'), errors: [{ messageId: 'array' }] },
    { code: check('useEffect(() => source.read(value), [source, value + 1]);'), errors: [missing('value'), { messageId: 'dependency' }] },
    { code: check('const ref = source.ref(); useEffect(() => ref.current, []);'), errors: [missing('ref.current')] },
    { code: check('const [state, setState] = useState(0); useEffect(() => setState(value), [value]);'), errors: [missing('setState')] },
    { code: check('const [state, dispatch] = useReducer(value, 0); useEffect(() => dispatch(1), []);'), errors: [missing('dispatch')] },
    {
      code: "import { useEffect as effect } from '@bedrock-core/ui'; function View(value) { effect(() => value(), []); }",
      errors: [missing('value')],
    },
    {
      code: "import * as Core from '@bedrock-core/ui-runtime'; function View(value) { Core.useEffect(() => value(), []); }",
      errors: [missing('value')],
    },
    {
      filename: fileURLToPath(new URL('../../packages/ui-runtime/src/hooks/check.ts', import.meta.url)),
      code: "import { useEffect as effect } from './useEffect'; function View(value) { effect(() => value(), []); }",
      errors: [missing('value')],
    },
  ],
});

test('the workspace ESLint configuration enables Core dependency errors', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: path.join(root, 'eslint.config.mjs'),
    overrideConfig: [tseslint.configs.disableTypeChecked],
  });
  const [result] = await eslint.lintText(check('useEffect(() => source.read(value), []);'), {
    filePath: path.join(root, 'packages/ui-runtime/src/hooks/dependency-fixture.ts'),
  });
  const problems = result.messages.filter(message => message.ruleId === 'core-hooks/exhaustive-deps');

  assert.equal(problems.length, 1);
  assert.equal(problems[0].severity, 2);
});


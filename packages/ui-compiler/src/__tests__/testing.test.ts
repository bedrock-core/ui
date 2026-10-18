import type { JSX } from '@bedrock-core/ui-runtime';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Button, Container, Disclosure, Form, Option, Panel, Screen, Select, Tabs, Text } from '@bedrock-core/ui-runtime';
import { Link } from '@bedrock-core/navigation';
import { describe, expect, it } from 'vitest';
import { jsx } from '@bedrock-core/ui-runtime/jsx-runtime';
import { Input } from '../../../ore-styled/src/Input';
import { Slider } from '../../../ore-styled/src/Slider';
import { Dropdown } from '../../../ore-styled/src/Dropdown';
import { Checkbox } from '../../../ore-styled/src/Checkbox';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';

const spec = { namespace: 'shop', name: 'home' };
const sample = (): JSX.Element => Screen({ testId: 'home', children: Panel({
  testId: 'body', width: 240, height: 120,
  children: ['buy', 'cancel'].map(testId => Button({ testId, width: 100, height: 20, children: Text({ children: 'Buy' }) })),
}) });

describe('opt-in compiler test metadata', () => {
  for (const modal of [false, true]) {
    it(`maps local tab and disclosure toggles to unique qualified instances on an ${modal ? 'modal' : 'action'} form`, () => {
      const children = (): JSX.Element => Panel({ width: 240, children: [
        ...['first', 'second'].map(testId => Tabs({ testId, width: 160, height: 80, children: [
          Tabs.Tab({ header: Text({ children: 'One' }), children: Text({ children: 'First pane' }) }),
          Tabs.Tab({ header: Text({ children: 'Two' }), children: Text({ children: 'Second pane' }) }),
        ] })),
        Disclosure({ width: 160, header: Text({ children: 'Open' }), children: Text({ children: 'Rows' }) }),
        ...modal ? [jsx(() => Form.Button({ type: 'submit', children: Text({ children: 'Submit' }) }), {})] : [],
      ] });
      const source = (): JSX.Element => modal ? Form({ children: children() }) : Screen({ children: children() });
      const plain = compileFormScreen(source, spec);
      const compiled = compileFormScreen(source, { ...spec, testMetadata: true });
      const toggles = compiled.testMetadata!.controls.filter(control => control.interaction === 'local-toggle');

      expect(toggles.map(control => [control.role, control.name?.value])).toEqual([
        ['checkbox', 'Tab 1'], ['checkbox', 'Tab 2'], ['checkbox', 'Tab 1'], ['checkbox', 'Tab 2'], ['checkbox', 'Disclosure'],
      ]);
      expect(new Set(toggles.map(control => JSON.stringify(control.paths))).size).toBe(5);
      expect(toggles.every(control => control.paths.length === 1 && control.paths[0]!.at(-1) === `${compiled.document.namespace}_${control.node}`)).toBe(true);
      expect(compiled.document).toEqual(plain.document);
      expect(compiled.faces).toEqual(plain.faces);
      expect(compiled.snapshot).toEqual(plain.snapshot);
    });
  }

  for (const multiple of [false, true]) {
    it(`scopes native Option identities within each ${multiple ? 'multiple' : 'single'} Select without changing output`, () => {
      const modal = (): JSX.Element => Form({ children: Panel({ width: 250, height: 160, children: [...['first', 'second'].map(group => jsx(() => Select({
        name: group, testId: group, ...multiple ? { multiple: true as const, defaultValue: ['a'] } : { multiple: false as const, defaultValue: 'a' }, width: 200,
        children: ['a', 'b', 'c'].map((value, index) => Option({ value, label: value.toUpperCase(), testId: `${group}-${value}`,
          width: 48, height: 20, ...index === 1 ? { visible: false, enabled: false } : {} })),
      }), {})), jsx(() => Form.Button({ type: 'submit', children: Text({ children: 'Submit' }) }), {})] }) });
      const plain = compileFormScreen(modal, spec);
      const tested = compileFormScreen(modal, { ...spec, testMetadata: true });
      const options = tested.testMetadata?.controls.filter(control => control.interaction === 'form-option') ?? [];

      expect(options.map(control => [control.testId, control.role, control.name])).toEqual(['first', 'second'].flatMap(group =>
        ['a', 'b', 'c'].map(value => [`${group}-${value}`, 'checkbox', { kind: 'literal', value: value.toUpperCase() }])));
      expect(new Set(options.map(control => JSON.stringify(control.paths))).size).toBe(6);
      expect(options.every(control => control.paths.length === 1)).toBe(true);

      for (const group of ['first', 'second']) {
        const parent = tested.testMetadata!.controls.find(control => control.testId === group)!.paths[0]!;

        expect(options.filter(control => control.testId?.startsWith(group)).every(control => parent.every((key, index) => control.paths[0]?.[index] === key))).toBe(true);
      }

      expect(tested.document).toEqual(plain.document);
      expect(tested.faces).toEqual(plain.faces);
      expect(tested.entries.map(({ entry, role }) => ({ entry, role }))).toEqual(plain.entries.map(({ entry, role }) => ({ entry, role })));
      expect(tested.snapshot).toEqual(plain.snapshot);
    });
  }

  it('validates native Option annotations and retains their authored names', () => {
    const modal = (props: Record<string, unknown> = {}): (() => JSX.Element) => () => Form({ children: Panel({
      children: [jsx(() => Select({ name: 'choice', children: Option({ value: 'a', label: 'Alpha', ...props }) }), {}),
        jsx(() => Form.Button({ type: 'submit', children: Text({ children: 'Submit' }) }), {})],
    }) });

    expect(compileFormScreen(modal({ testId: 'choice-a', testName: 'First choice' }), { ...spec, testMetadata: true }).testMetadata?.controls.find(control => control.testId === 'choice-a'))
      .toMatchObject({ role: 'checkbox', interaction: 'form-option', name: { kind: 'declared', value: 'First choice' } });

    for (const [props, error] of [[{ testId: ' ' }, 'testId'], [{ testRole: 'invalid' }, 'Unknown testRole'], [{ testName: 42 }, 'testName must be a string']] as const) {
      expect(() => compileFormScreen(modal(props), { ...spec, testMetadata: true })).toThrow(error);
    }
  });

  it('exposes the versioned contract and JSON schema without loading the Minecraft runtime', () => {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { TEST_METADATA_PATH, TEST_METADATA_VERSION } from '@bedrock-core/ui-compiler/testing';
      import { createRequire } from 'node:module';
      import { readFileSync } from 'node:fs';
      const schema = JSON.parse(readFileSync(createRequire(import.meta.url).resolve('@bedrock-core/ui-compiler/testing/schema'), 'utf8'));
      process.stdout.write(JSON.stringify({ path: TEST_METADATA_PATH, version: TEST_METADATA_VERSION, schemaVersion: schema.properties.schemaVersion.const }));
    `], { cwd: fileURLToPath(new URL('../..', import.meta.url)), encoding: 'utf8' });

    expect(JSON.parse(output)).toEqual({ path: 'bedrock-core/test-metadata.json', version: 1, schemaVersion: 1 });
  });

  it('records authored semantics independently of rendered text, mechanisms, and production output', () => {
    const screen = (annotated: boolean): (() => JSX.Element) => () => Screen({ children: Panel({ children: Button({
      ...annotated ? { testId: 'notifications', testRole: 'checkbox', testName: 'Notifications' } : {},
      children: Text({ children: 'Enable alerts' }),
    }) }) });
    const plain = compileFormScreen(screen(false), spec);
    const annotated = compileFormScreen(screen(true), { ...spec, testMetadata: true });

    expect(annotated.testMetadata?.controls.find(control => control.testId === 'notifications'))
      .toMatchObject({ role: 'checkbox', name: { kind: 'declared', value: 'Notifications' }, interaction: 'form-button' });
    expect(annotated.document).toEqual(plain.document);
    expect(annotated.faces).toEqual(plain.faces);
    expect(annotated.snapshot).toEqual(plain.snapshot);
  });

  it('rejects invalid JavaScript semantic declarations when metadata is enabled', () => {
    expect(() => compileFormScreen(() => Screen({ children: Panel({ children: Button({ testRole: 'unknown' as never }) }) }), { ...spec, testMetadata: true }))
      .toThrow('Unknown testRole');
    expect(() => compileFormScreen(() => Screen({ children: Panel({ children: Button({ testName: 42 as never }) }) }), { ...spec, testMetadata: true }))
      .toThrow('testName must be a string');
  });

  it('leaves production documents, payload ordering, and snapshots unchanged', () => {
    const normal = compileFormScreen(sample, spec);
    const testing = compileFormScreen(sample, { ...spec, testMetadata: true });

    expect(normal.testMetadata).toBeUndefined();
    expect(testing.document).toEqual(normal.document);
    expect(testing.faces).toEqual(normal.faces);
    expect(testing.snapshot).toEqual(normal.snapshot);
    expect(testing.entries.map(entry => ({ entry: entry.entry, role: entry.role })))
      .toEqual(normal.entries.map(entry => ({ entry: entry.entry, role: entry.role })));
    expect(JSON.stringify(testing.document)).not.toContain('testId');
    expect(testing.testMetadata).toMatchObject({ screen: 'shop:home', testId: 'home', host: 'form-action' });
  });

  it('identifies instances separately when their generated definition is shared', () => {
    const { document, testMetadata } = compileFormScreen(sample, { ...spec, testMetadata: true });
    const buttons = testMetadata?.controls.filter(control => control.role === 'button') ?? [];

    expect(buttons.map(control => control.testId)).toEqual(['buy', 'cancel']);
    expect(buttons.map(control => control.name)).toEqual([
      { kind: 'literal', value: 'Buy' }, { kind: 'literal', value: 'Buy' },
    ]);
    expect(buttons.every(control => control.interaction === 'form-button')).toBe(true);
    expect(buttons[0]?.paths).not.toEqual(buttons[1]?.paths);

    for (const button of buttons) {
      let found: unknown = document;

      for (const key of button.paths[0] ?? []) {
        found = (found as Record<string, unknown>)[key];
      }

      expect(found).toMatchObject({ type: 'stack_panel', controls: [{ 'cell@shop_home.press_1': { collection_index: expect.any(Number) } }] });
    }

  });

  it('keeps duplicate IDs for strict locator resolution and rejects invalid IDs', () => {
    const duplicate = (): JSX.Element => Screen({ children: Panel({ children: [Button({ testId: 'same' }), Button({ testId: 'same' })] }) });
    const result = compileFormScreen(duplicate, { ...spec, testMetadata: true });

    expect(result.testMetadata?.controls.filter(control => control.testId === 'same')).toHaveLength(2);
    expect(() => compileFormScreen(() => Screen({ children: Panel({ testId: ' ' }) }), { ...spec, testMetadata: true }))
      .toThrow('testId must be a nonempty string');
  });

  it('retains metadata on static screens whose components are removed at runtime', () => {
    const staticScreen = (): JSX.Element => Screen({ testId: 'menu', static: true, children: Panel({
      children: Link({ testId: 'next', to: 'details', children: Text({ children: 'Next' }) }),
    }) });
    const result = compileFormScreen(staticScreen, { ...spec, testMetadata: true });

    expect(result.table).toBeDefined();
    expect(result.testMetadata?.controls.find(control => control.testId === 'next')?.role).toBe('button');
  });

  it('forwards a styled field ID to the field rather than its label wrapper', () => {
    const modal = (): JSX.Element => Form({ testId: 'settings', children: Panel({ width: 250, height: 160, children: [
      jsx(() => Input({ testId: 'nickname', label: 'Name', name: 'nickname' }), {}),
      jsx(() => Form.Button({ testId: 'save', type: 'submit', children: Text({ children: 'Save' }) }), {}),
    ] }) });
    const result = compileFormScreen(modal, { ...spec, testMetadata: true });

    expect(result.testMetadata?.testId).toBe('settings');
    expect(result.testMetadata?.controls.filter(control => control.testId === 'nickname'))
      .toMatchObject([{ role: 'textbox', interaction: 'form-input', name: { kind: 'declared', value: 'Name' } }]);
    expect(result.testMetadata?.controls.find(control => control.testId === 'save'))
      .toMatchObject({ role: 'button', interaction: 'modal-button' });
    expect(result.document).toEqual(compileFormScreen(modal, spec).document);
  });

  it('records container identities without promising action-form interaction support', () => {
    const chest = (): JSX.Element => Container({ testId: 'inventory', entity: 'shop:chest', width: 200, height: 150,
      children: Button({ testId: 'take', width: 50, height: 20 }),
    });
    const result = compileScreen(chest, { ...spec, testMetadata: true });

    expect(result.testMetadata).toMatchObject({ testId: 'inventory', host: 'chest' });
    expect(result.testMetadata?.controls.find(control => control.testId === 'take')?.interaction).toBe('unsupported');
  });

  it('retains field identities and checkbox semantics through styled wrappers on both form hosts', () => {
    const modal = (): JSX.Element => Form({ children: Panel({ width: 250, height: 230, children: [
      jsx(() => Slider({ testId: 'volume', name: 'volume', label: 'Volume', min: 0, max: 10 }), {}),
      jsx(() => Dropdown({ testId: 'theme', name: 'theme', label: 'Theme', options: ['Light', 'Dark'] }), {}),
      jsx(() => Checkbox({ testId: 'sound', name: 'sound', label: 'Sound' }), {}),
      jsx(() => Form.Button({ type: 'submit', children: Text({ children: 'Save' }) }), {}),
    ] }) });
    const metadata = compileFormScreen(modal, { ...spec, testMetadata: true }).testMetadata;

    expect(metadata?.controls.filter(control => control.testId).map(control => [control.testId, control.role]))
      .toEqual([['volume', 'slider'], ['theme', 'combobox'], ['sound', 'checkbox']]);
    expect(metadata?.controls.find(control => control.testId === 'sound'))
      .toMatchObject({ role: 'checkbox', interaction: 'form-toggle' });
    expect(metadata?.controls.find(control => control.testId === 'volume'))
      .toMatchObject({ role: 'slider', interaction: 'form-slider', paths: [expect.any(Array)] });
    expect(metadata?.controls.find(control => control.testId === 'theme'))
      .toMatchObject({ role: 'combobox', interaction: 'form-dropdown', paths: [expect.any(Array)] });
    expect(compileFormScreen(modal, { ...spec, testMetadata: true }).document).toEqual(compileFormScreen(modal, spec).document);

    const action = (): JSX.Element => Screen({ children: Panel({ width: 240, height: 100,
      children: jsx(() => Checkbox({ testId: 'sound', label: 'Sound' }), {}),
    }) });
    const toggle = compileFormScreen(action, { ...spec, testMetadata: true }).testMetadata?.controls.find(control => control.testId === 'sound');

    expect(toggle).toMatchObject({ role: 'checkbox', interaction: 'form-button', name: { kind: 'declared', value: 'Sound' } });
  });

  it('forwards authored names through styled fields without annotating their layout wrappers', () => {
    const modal = (): JSX.Element => Form({ children: Panel({ width: 250, height: 230, children: [
      jsx(() => Input({ testId: 'nickname', testRole: 'textbox', testName: 'Nickname', label: 'Display name', name: 'nickname' }), {}),
      jsx(() => Slider({ testId: 'volume', testName: 'Master volume', label: 'Volume', name: 'volume', min: 0, max: 10 }), {}),
      jsx(() => Dropdown({ testId: 'theme', testName: 'Color theme', label: 'Theme', name: 'theme', options: ['Light', 'Dark'] }), {}),
      jsx(() => Checkbox({ testId: 'sound', testRole: 'checkbox', testName: 'Enable sound', label: 'Sound', name: 'sound' }), {}),
      jsx(() => Form.Button({ type: 'submit', children: Text({ children: 'Save' }) }), {}),
    ] }) });
    const metadata = compileFormScreen(modal, { ...spec, testMetadata: true }).testMetadata;

    expect(metadata?.controls.filter(control => control.testId).map(control => [control.testId, control.role, control.name]))
      .toEqual([
        ['nickname', 'textbox', { kind: 'declared', value: 'Nickname' }],
        ['volume', 'slider', { kind: 'declared', value: 'Master volume' }],
        ['theme', 'combobox', { kind: 'declared', value: 'Color theme' }],
        ['sound', 'checkbox', { kind: 'declared', value: 'Enable sound' }],
      ]);
  });
});

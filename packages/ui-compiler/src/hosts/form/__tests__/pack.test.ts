import type { FunctionComponent, JSX } from '@bedrock-core/ui-runtime';
import { Button, Dropdown, Form, Input, Option, Panel, Screen, Scroll, Slider, Text, Toggle } from '@bedrock-core/ui-runtime';
import { jsx } from '@bedrock-core/ui-runtime/jsx-runtime';
import { describe, expect, it } from 'vitest';
import type { Document } from '../../../jsonui';
import { createSupportLinker } from '../../../support/link';
import { compileFormScreen } from '../compile';
import { buildFormPack, type CompiledFormPack } from '../pack';

const action = (): JSX.Element => Screen({ children: Panel({ children: Button({ testId: 'buy', children: Text({ children: 'Buy' }) }) }) });
const modal = (overflow = false): (() => JSX.Element) => () => Form({ children: Panel({ width: 300, height: 230, children: [
  Scroll({ width: 288, height: 180, children: Panel({ width: 280, ...overflow ? { height: 240 } : {}, children: [
    jsx(Toggle, { name: 'enabled', testId: 'enabled' }),
    jsx(Input as unknown as FunctionComponent, { name: 'name', testId: 'name' }),
    jsx(Slider as unknown as FunctionComponent, { name: 'amount', min: 0, max: 10 }),
    jsx(Dropdown as unknown as FunctionComponent, { name: 'kind', testId: 'kind', children: [Option({ value: 'a', label: 'A' })] }),
  ] }) }),
  Form.Button({ type: 'submit', label: 'Save' }),
] }) });

const build = (addon: string): CompiledFormPack => buildFormPack([
  compileFormScreen(action, { namespace: addon, name: 'home', testMetadata: true }),
  compileFormScreen(modal(true), { namespace: addon, name: 'settings', testMetadata: true }),
], addon);

const documents = (pack: CompiledFormPack): Document[] => [
  pack.hook.document, pack.router, pack.support.document,
  ...pack.screens.flatMap(screen => [screen.document, { namespace: screen.facesNamespace, ...screen.faces }]),
];

/** Resolves literal references in an artifact set, including same-namespace inheritance. */
const unresolved = (docs: Document[]): string[] => {
  const definitions = new Set(docs.flatMap(doc => Object.keys(doc)
    .filter(key => key !== 'namespace').map(key => `${doc.namespace}.${key.split('@')[0]}`)));
  const missing: string[] = [];
  for (const doc of docs) {
    const references = JSON.stringify(doc).matchAll(/@([A-Za-z0-9_.-]+)/g);
    for (const [, name] of references) {
      if (name !== undefined && !definitions.has(name.includes('.') ? name : `${doc.namespace}.${name}`)) missing.push(name);
    }
  }
  return missing;
};

describe('an addon-owned form pack', () => {
  it('provides literal field defaults without reading variables from an absent ancestor', () => {
    const support = build('alpha').support.document;
    for (const name of ['input', 'input_control', 'dropdown', 'dropdown_control', 'dropdown_closed_box']) {
      const control = Object.entries(support).find(([key]) => key.split('@')[0] === `core_ui_form_components_${name}`)?.[1];
      expect(control).toMatchObject({
        '$hover_texture|default': '', '$pressed_texture|default': '', '$locked_texture|default': '',
      });
    }
    for (const name of ['input', 'input_control']) {
      expect(support[`core_ui_form_components_${name}`]).toMatchObject({ '$placeholder_scale|default': 2 });
    }
  });

  it('keeps native Input clipping at field height while applying top-left label offsets from its middle', () => {
    const pack = build('alpha');
    const input = pack.support.document.core_ui_form_components_input_control;
    if (typeof input === 'string' || input === undefined || !('controls' in input)) { throw new Error('Input template missing'); }
    const area = input.controls?.[0]?.text_area;
    const frame = area?.controls?.[0]?.value_frame;
    const value = frame?.controls?.[0]?.['display_text_static@alpha__ui_support.core_ui_components_label_static'];

    expect(area).toMatchObject({ size: ['100% - 4px', '100%'], clips_children: true,
      anchor_from: 'left_middle', anchor_to: 'left_middle' });
    expect(frame).toMatchObject({ size: ['100%', 1], anchor_from: 'left_middle', anchor_to: 'left_middle' });
    expect(value).toMatchObject({ $font_type: '$value_font_type', offset: '$value_offset',
      anchor_from: 'top_left', anchor_to: 'top_left' });
  });

  it('resolves action and modal support with no shared UI JSON and includes factory dependencies', () => {
    const pack = build('alpha');
    const output = documents(pack);
    expect(unresolved(output)).toEqual([]);
    expect(JSON.stringify(output)).not.toMatch(/core_ui_(?:common|components|form_components|shapes)\./);
    expect(pack.support.document).toHaveProperty('core_ui_form_components_dropdown_option_radio');
    expect(pack.support.document).toHaveProperty('core_ui_form_components_slider_body');
    expect(pack.support.document).toHaveProperty('core_ui_shapes_scroll');
    expect(pack.support.document).toHaveProperty('core_ui_shapes_scrollbar');
    expect(pack.support.file).toBe('ui/core-ui/support/alpha.json');
  });

  it('omits unused widget families and shares dependencies between screens', () => {
    const one = compileFormScreen(action, { namespace: 'alpha', name: 'home' });
    const two = compileFormScreen(action, { namespace: 'alpha', name: 'other' });
    const pack = buildFormPack([one, two], 'alpha');
    expect(Object.keys(pack.support.document).sort()).toEqual([
      'core_ui_common_gamepad_cursor_button', 'core_ui_common_gamepad_cursor_image', 'namespace',
    ]);
    expect(pack.support.document).toEqual(buildFormPack([two, one], 'alpha').support.document);
    expect(JSON.stringify(pack.support.document)).not.toContain('slider');
  });

  it('keeps every testing path addressable after linking and leaves compiler inputs intact', () => {
    const source = compileFormScreen(modal(), { namespace: 'alpha', name: 'settings', testMetadata: true });
    const before = JSON.stringify({ document: source.document, metadata: source.testMetadata, faces: source.faces });
    const screen = buildFormPack([source], 'alpha').screens[0]!;
    let locations = 0;
    for (const control of screen.testMetadata?.controls ?? []) {
      for (const location of control.paths) {
        let value: unknown = screen.document;
        for (const part of location) {
          expect(value).toBeTypeOf('object');
          value = Reflect.get(value as object, part);
        }
        expect(value).toBeTypeOf('object');
        locations += 1;
      }
    }
    expect(locations).toBeGreaterThan(4);
    expect(JSON.stringify({ document: source.document, metadata: source.testMetadata, faces: source.faces })).toBe(before);
    expect(screen.snapshot).toBe(source.snapshot);
    expect(screen.entries).toBe(source.entries);
  });

  it('initializes collection and view reads in lazy screen cells and preserves explicit binding conditions', () => {
    const source = compileFormScreen(modal(), { namespace: 'alpha', name: 'settings' });
    source.document.probe = { bindings: [
      { binding_type: 'collection', binding_name: '#custom_text', binding_condition: 'once' },
      { binding_type: 'view', source_property_name: '#custom_text', target_property_name: '#text', binding_condition: 'once' },
      { binding_name: '#title_text' },
    ] };
    const before = JSON.stringify(source);
    const pack = buildFormPack([source], 'alpha');
    const bindings: Record<string, unknown>[] = [];
    const collect = (value: unknown): void => {
      if (value === null || typeof value !== 'object') { return; }
      const record = value as Record<string, unknown>;
      if (Array.isArray(record.bindings)) { bindings.push(...record.bindings as Record<string, unknown>[]); }
      Object.values(record).forEach(collect);
    };

    documents(pack).forEach(collect);
    const reads = bindings.filter(binding => binding.binding_type === 'collection' || binding.binding_type === 'view');

    expect(reads.length).toBeGreaterThan(10);
    expect(reads.every(binding => binding.binding_condition !== undefined)).toBe(true);
    expect(pack.screens[0]?.document.probe).toEqual(source.document.probe);
    expect(JSON.stringify(source)).toBe(before);
  });

  it('isolates helpers and routers across addons while keeping shared vanilla properties identical', () => {
    const alpha = build('alpha');
    const beta = build('beta');
    expect(alpha.support.file).not.toBe(beta.support.file);
    expect(alpha.support.document.namespace).not.toBe(beta.support.document.namespace);
    expect(alpha.router.namespace).not.toBe(beta.router.namespace);
    for (const key of ['third_party_server_screen', 'long_form', 'custom_form']) {
      expect(alpha.hook.document[key]).toEqual(beta.hook.document[key]);
    }
    // Static closure in both orders; Bedrock pack stacking still needs client validation.
    for (const packs of [[alpha, beta], [beta, alpha]]) {
      expect(unresolved(packs.flatMap(documents))).toEqual([]);
    }
  });

  it('does not rewrite authored text that happens to look like a template name', () => {
    const linker = createSupportLinker('alpha');
    const linked = linker.link({ namespace: 'alpha', label: { type: 'label', text: 'core_ui_common.state_face' } });
    expect(linked.label.text).toBe('core_ui_common.state_face');
    expect(linker.support().document).toEqual({ namespace: 'alpha__ui_support' });
    expect(() => linker.link({ 'bad@core_ui_common.missing': {} })).toThrow('Unknown compiler UI definition');
  });

  it('rejects mixed addon ownership and invalid namespaces', () => {
    const source = compileFormScreen(action, { namespace: 'alpha', name: 'home' });
    expect(() => buildFormPack([source], 'beta')).toThrow('one addon namespace');
    expect(() => createSupportLinker('../alpha')).toThrow('Invalid UI addon namespace');
  });
});

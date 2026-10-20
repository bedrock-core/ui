import { Button, Container, Form, Panel, Screen, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { collapsePanels } from '../collapse';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';
import type { Control, Document } from '../jsonui';
import { definition, findAll } from '../__fixtures__/helpers';

const box = (extra: Partial<Control> = {}): Control => ({
  type: 'panel', size: [120, 70], offset: [10, 20],
  anchor_from: 'top_left', anchor_to: 'top_left', ...extra,
});
const label = (): Control => box({ type: 'label', text: 'Caption', size: [40, 10], offset: [3, 4] });
const document = (wrapper: Control, parent: Partial<Control> = {}): Document => ({
  namespace: 'test', screen: box({ size: [320, 210], offset: [0, 0], controls: [{ wrapper }], ...parent }),
});
const candidates = new Set(['wrapper', 'nested', 'empty']);

describe('layout panel collapse', () => {
  it('preserves leaf boxes, draw order and accumulated layers across nested panels', () => {
    const source = document(box({ layer: 2, controls: [
      { nested: box({ layer: 3, offset: [-2, 5], controls: [{ caption: { ...label(), layer: 4 } }] }) },
      { empty: box() },
      { icon: box({ type: 'image', texture: 'textures/ui/test_icon', size: [16, 16], offset: [50, 7] }) },
    ] }));
    const result = collapsePanels(source, candidates);
    const controls = definition(result, 'screen').controls;

    expect(controls).toEqual([
      { caption: { ...label(), offset: [11, 29], layer: 9 } },
      { icon: box({ type: 'image', texture: 'textures/ui/test_icon', size: [16, 16], offset: [60, 27], layer: 2 }) },
    ]);
    expect(definition(source, 'screen').controls?.[0]).toHaveProperty('wrapper');
    expect(collapsePanels(result, candidates)).toEqual(result);
  });

  it.each([
    { visible: false }, { enabled: false }, { bindings: [] }, { $mode: 'active' },
    { collection_name: 'form_buttons' }, { focus_enabled: true },
    { clips_children: true }, { property_bag: { '#state': 1 } },
  ])('retains a panel with behavior: %j', extra => {
    const source = document(box({ ...extra, controls: [{ caption: label() }] }));
    expect(collapsePanels(source, candidates)).toEqual(source);
  });

  it.each([
    { type: 'stack_panel' }, { type: 'grid' }, { size: [120, '100%c'] },
    { size: ['default', 70] }, { collection_name: 'form_buttons' },
    { property_bag_for_children: { '#state': 1 } },
  ] as Partial<Control>[])('preserves a parent whose layout depends on its direct children: %j', parent => {
    const source = document(box({ controls: [{ caption: label() }] }), parent);
    expect(collapsePanels(source, candidates)).toEqual(source);
  });

  it.each([
    { size: ['50%', 10] }, { offset: ['50%', 0] }, { anchor_to: 'bottom_right' },
    { bindings: [{ binding_type: 'view', source_property_name: '#position', target_property_name: '#offset' }] },
    { collection_index: 0 }, { min_size: ['100%', 10] }, { max_size: ['100%', 10] }, { draggable: true }, { follows_cursor: true },
  ] as Partial<Control>[])('preserves the parent of a relative or bound child: %j', extra => {
    const source = document(box({ controls: [{ caption: { ...label(), ...extra } }] }));
    expect(collapsePanels(source, candidates)).toEqual(source);
  });

  it('preserves a fixed label cap while promoting its unchanged box', () => {
    const source = document(box({ controls: [{ caption: { ...label(), max_size: [40, 10] } }] }));
    const result = collapsePanels(source, candidates);

    expect(definition(result, 'screen').controls).toEqual([{ caption: { ...label(), offset: [13, 24], max_size: [40, 10] } }]);
  });

  it('retains inherited instances and panels outside the authored layout candidates', () => {
    const source = document(box({ controls: [{ 'caption@test.label': label() }] }));
    expect(collapsePanels(source, candidates)).toEqual(source);
    const ordinary = document(box({ controls: [{ caption: label() }] }));
    expect(collapsePanels(ordinary, new Set())).toEqual(ordinary);
  });

  it('retains panels named by bindings or control selectors', () => {
    for (const reader of [
      { bindings: [{ binding_type: 'view', source_control_name: 'wrapper', source_property_name: '#visible', target_property_name: '#visible' }] },
      { hover_control: 'wrapper' },
      { $content: 'screen/wrapper/caption' },
    ]) {
      const source = document(box({ controls: [{ caption: label() }] }));
      source['reader'] = reader as Control;
      expect(collapsePanels(source, candidates)).toEqual(source);
    }
  });

  it('preserves scoped lookups inside descendants', () => {
    const source = document(box({ controls: [{ child: box({ controls: [{ caption: {
      ...label(), bindings: [{ binding_type: 'view', resolve_sibling_scope: true,
        source_control_name: 'peer', source_property_name: '#value', target_property_name: '#text' }],
    } }] }) }] }));
    expect(collapsePanels(source, candidates)).toEqual(source);
  });

  it('keeps the local coordinates of a child that another control reads', () => {
    const source = document(box({ controls: [{ caption: label() }] }));
    source['reader'] = { bindings: [{ binding_type: 'view', source_control_name: 'caption',
      source_property_name: '#offset', target_property_name: '#offset' }] };
    expect(collapsePanels(source, candidates)).toEqual(source);
  });

  it('prevents promoted children from colliding with their new siblings', () => {
    const wrapper = box({ controls: [{ caption: label() }] });
    const source = document(wrapper, { controls: [{ caption: label() }, { wrapper }] });
    expect(collapsePanels(source, candidates)).toEqual(source);
  });

  it('keeps definition roots available to external references', () => {
    const source: Document = { namespace: 'test', wrapper: box({ controls: [{ caption: label() }] }) };
    expect(collapsePanels(source, candidates)).toEqual(source);
  });
});

const content = (modal = false) => Panel({ width: 200, height: 100, padding: 8, children: [
  Panel({ testId: 'body', width: 100, height: 20, children: Text({ testId: 'title', children: 'Title' }) }),
  modal
    ? Form.Button({ testId: 'action', type: 'submit', width: 80, height: 20, children: Text({ children: 'Go' }) })
    : Button({ testId: 'action', width: 80, height: 20, onPress: () => undefined, children: Text({ children: 'Go' }) }),
] });
const spec = { namespace: 'test', name: 'collapse', testMetadata: true };

describe('collapsed compiler output', () => {
  it.each([
    ['action form', () => compileFormScreen(() => Screen({ children: content() }), spec)],
    ['modal form', () => compileFormScreen(() => Form({ children: content(true) }), spec)],
    ['container', () => compileScreen(() => Container({ entity: 'test:box', width: 200, height: 100, children: content() }), spec)],
  ] as const)('keeps concrete interaction paths for %s', (_host, compile) => {
    const result = compile();
    const metadata = result.testMetadata!;
    const group = metadata.controls.find(control => control.testId === 'body');
    const action = metadata.controls.find(control => control.testId === 'action');
    const title = metadata.controls.find(control => control.testId === 'title');

    expect(group).toMatchObject({ role: 'group', paths: [], interaction: 'unsupported' });
    for (const control of [action, title]) {
      expect(control?.paths).toHaveLength(1);
      let found: unknown = result.document;
      for (const key of control!.paths[0]!) found = (found as Record<string, unknown>)[key];
      expect(found).toBeDefined();
      expect(control?.paths[0]).not.toContain(group?.node);
    }
    expect(findAll(result.face.document, name => name === group?.node)).toHaveLength(1);
  });
});

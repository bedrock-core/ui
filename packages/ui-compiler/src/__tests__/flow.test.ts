import type { FlexStyle } from '@bedrock-core/flexbox';
import type { JSX } from '@bedrock-core/ui-runtime';
import { Button, Container, Form, Image, Panel, Screen, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { compileScreen } from '../compile';
import { type Flow, flowOf, flowPanels } from '../flow';
import { compileFormScreen } from '../hosts/form/compile';
import type { Control, Document } from '../jsonui';
import { child, definition, find } from '../__fixtures__/helpers';

const box = (extra: Partial<Control> = {}): Control => ({
  type: 'panel', size: [100, 80], offset: [15, 20],
  anchor_from: 'top_left', anchor_to: 'top_left', ...extra,
});
const group = (flow: Flow = 'horizontal'): Control => box({ controls: [
  { first: box({ type: 'image', size: [20, 10], offset: flow === 'horizontal' ? [0, 2] : [2, 0], layer: 3 }) },
  { second: box({ type: 'label', size: [30, 15], offset: flow === 'horizontal' ? [20, 8] : [8, 10], text: 'Hello' }) },
] });
const document = (control = group()): Document => ({ namespace: 'test', layout: control });
const convert = (source: Document, flow: Flow = 'horizontal', background = false) =>
  flowPanels(source, new Map([['layout', { flow, background }]]));

describe('native flow selection', () => {
  const element = (style: FlexStyle, children: JSX.Node = []): JSX.Element => ({ type: 'panel', props: { __layout: style, children } });

  it('recognizes ordinary row and column layout', () => {
    expect(flowOf(element({ flexDirection: 'row' }))).toBe('horizontal');
    expect(flowOf(element({ flexDirection: 'column' }))).toBe('vertical');
    expect(flowOf(element({}))).toBe('vertical');
    expect(flowOf(element({ justifyContent: 'center' }))).toBe('vertical');
    expect(flowOf({ type: 'panel', props: {} })).toBeUndefined();
  });

  it.each([
    { flexDirection: 'row-reverse' }, { flexDirection: 'column-reverse' },
    { wrap: 'wrap' }, { wrap: 'wrap-reverse' },
  ] as FlexStyle[])('keeps solved layout for %j', style => {
    expect(flowOf(element(style))).toBeUndefined();
  });

  it('rejects absolute children even behind transparent fragments', () => {
    const absolute = element({ position: 'absolute', left: 0, top: 0 });
    expect(flowOf(element({}, [absolute]))).toBeUndefined();
    expect(flowOf(element({}, [{ type: 'fragment', props: { children: absolute } }]))).toBeUndefined();
    expect(flowOf(element({}, [element({ left: 2 })]))).toBeUndefined();
  });

  it('keeps the explicit folding stack mechanism', () => {
    const explicit = element({});
    explicit.props.stack = true;
    expect(flowOf(explicit)).toBeUndefined();
  });
});

describe('native stack output', () => {
  it.each(['horizontal', 'vertical'] as const)('replaces %s positioning while preserving sizes, cross offsets and layers', flow => {
    const source = document(group(flow));
    const result = convert(source, flow);
    const stack = definition(result, 'layout');

    expect(stack).toMatchObject({ type: 'stack_panel', orientation: flow, size: [100, 80], offset: [15, 20] });
    expect(child(stack, 'first')).toEqual(child(definition(source, 'layout'), 'first'));
    expect(child(stack, 'second')).toEqual({
      ...child(definition(source, 'layout'), 'second'), offset: flow === 'horizontal' ? [0, 8] : [8, 0],
    });
    expect(stack.controls?.map(Object.keys)).toEqual([['first'], ['second']]);
    expect(convert(result, flow)).toEqual(result);
    expect(definition(source, 'layout').type).toBe('panel');
  });

  it('uses the existing content control above a background', () => {
    const source = document(box({ controls: [
      { bg: { type: 'image', size: ['100%', '100%'], texture: 'textures/ui/frame' } },
      { content: { ...group(), size: ['100%', '100%'], offset: [0, 0], layer: 1 } },
    ] }));
    const result = definition(convert(source, 'horizontal', true), 'layout');
    expect(result.type).toBe('panel');
    expect(result.controls).toHaveLength(2);
    expect(child(result, 'bg')).toEqual(child(definition(source, 'layout'), 'bg'));
    expect(child(result, 'content')).toMatchObject({ type: 'stack_panel', orientation: 'horizontal', layer: 1 });
  });

  it.each([1, 19, 21])('preserves a gap, padding or overlap at offset %s', x => {
    const source = document();
    child(definition(source, 'layout'), 'second').offset = [x, 8];
    expect(convert(source)).toEqual(source);
  });

  it.each([
    { size: ['50%', 15] }, { size: ['default', 15] }, { offset: ['50%', 8] },
    { visible: false }, { visible: '#visible' }, { ignored: true }, { bindings: [] }, { variables: [] },
    { min_size: [5, 5] }, { max_size: [40, 40] }, { anchor_from: 'center' },
    { collection_index: 1 }, { draggable: true }, { property_bag: { '#value': 1 } },
  ] as Partial<Control>[])('preserves children with relative or dynamic geometry: %j', extra => {
    const source = document();
    Object.assign(child(definition(source, 'layout'), 'second'), extra);
    expect(convert(source)).toEqual(source);
  });

  it.each([
    { type: 'stack_panel' }, { size: [100, '100%c'] }, { bindings: [] },
    { collection_name: 'form_buttons' }, { $mode: 'test' }, { clips_children: true },
  ] as Partial<Control>[])('preserves a parent with behavior: %j', extra => {
    const source = document({ ...group(), ...extra });
    expect(convert(source)).toEqual(source);
  });

  it('preserves references, inherited controls and panels outside the candidate set', () => {
    const source = document();
    expect(flowPanels(source, new Map())).toEqual(source);
    source['reader'] = { bindings: [{ binding_type: 'view', source_control_name: 'second', source_property_name: '#offset', target_property_name: '#offset' }] };
    expect(convert(source)).toEqual(source);
    const inherited = document(group());
    definition(inherited, 'layout').controls![1] = { 'second@test.label': child(definition(inherited, 'layout'), 'second') };
    expect(convert(inherited)).toEqual(inherited);
  });
});

const content = (modal: boolean): JSX.Element => Panel({ width: 200, height: 100, children: Panel({
  testId: 'row', flexDirection: 'row', width: 100, height: 24, background: 'textures/ui/frame', children: [
    Image({ testId: 'icon', texture: 'textures/ui/test_icon', width: 16, height: 16 }),
    modal
      ? Form.Button({ testId: 'action', type: 'submit', width: 40, height: 20, children: Text({ children: 'Go' }) })
      : Button({ testId: 'action', width: 40, height: 20, onPress: () => undefined, children: Text({ children: 'Go' }) }),
  ],
}) });
const spec = { namespace: 'test', name: 'flow', testMetadata: true };

describe('native flow through the compiler', () => {
  it.each(['center', 'flex-end', 'space-between'] as const)('uses %s as a stack only when no free space needs distributing', justifyContent => {
    const compile = (width: number) => compileFormScreen(() => Screen({ children: Panel({ width: 100, height: 40, children: Panel({
      testId: 'row', flexDirection: 'row', justifyContent, width, height: 20, background: 'textures/ui/frame', children: [
        Image({ texture: 'textures/ui/test_icon', width: 20, height: 20 }),
        Image({ texture: 'textures/ui/test_icon', width: 20, height: 20 }),
      ],
    }) }) }), spec);

    for (const width of [40, 60]) {
      const result = compile(width);
      const logical = result.testMetadata!.controls.find(control => control.testId === 'row')!;
      const [, panel] = find(result.document, name => name === logical.node);

      expect(child(panel, 'content').type).toBe(width === 40 ? 'stack_panel' : 'panel');
    }
  });

  it('uses native flow inside shared button faces without adding controls', () => {
    const result = compileFormScreen(() => Screen({ children: Panel({ width: 100, height: 60, children: Button({
      width: 80, height: 24, onPress: () => undefined, children: Panel({ flexDirection: 'row', width: 40, height: 16, children: [
        Image({ texture: 'textures/ui/test_icon', width: 16, height: 16 }),
        Image({ texture: 'textures/ui/test_icon', width: 24, height: 16 }),
      ] }),
    }) }) }), spec);
    const shared = Object.entries(result.faces).find(([name]) => name.endsWith('_content'))![1];
    const row = child(shared, 'c0');

    expect(row).toMatchObject({ type: 'stack_panel', orientation: 'horizontal', size: [40, 16] });
    expect(row.controls).toHaveLength(2);
    expect(child(row, 'c0')).toMatchObject({ size: [16, 16], offset: [0, 0] });
    expect(child(row, 'c1')).toMatchObject({ size: [24, 16], offset: [0, 0] });
  });

  it.each([
    ['action form', () => compileFormScreen(() => Screen({ children: content(false) }), spec), true],
    ['modal form', () => compileFormScreen(() => Form({ children: content(true) }), spec), true],
    ['container', () => compileScreen(() => Container({ entity: 'test:box', width: 200, height: 100, children: content(false) }), spec), false],
  ] as const)('preserves host mechanisms and concrete interaction paths for %s', (_host, compile, native) => {
    const result = compile();
    const controls = result.testMetadata!.controls;
    const row = controls.find(control => control.testId === 'row')!;
    const action = controls.find(control => control.testId === 'action')!;
    const [, panel] = find(result.document, name => name === row.node);
    const stack = child(panel, 'content');

    expect(stack.type).toBe(native ? 'stack_panel' : 'panel');
    expect(stack.orientation).toBe(native ? 'horizontal' : undefined);
    expect(stack.controls).toHaveLength(2);
    expect(action.paths).toHaveLength(1);
    if (native) { expect(action.interaction).not.toBe('unsupported'); }
    else { expect(action.interaction).toBe('unsupported'); }
    let resolved: unknown = result.document;
    for (const key of action.paths[0]!) { resolved = (resolved as Record<string, unknown>)[key]; }
    expect(resolved).toMatchObject({ size: [40, 20], offset: native ? [0, 0] : [16, 0] });
    const [, original] = find(result.face.document, name => name === row.node);
    expect(child(original, 'content').type).toBe('panel');
    expect(child(original, 'content').controls).toHaveLength(2);
  });
});

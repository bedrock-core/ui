import { FORM_COLLECTION } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { emit } from '../../../emit';
import type { IrDocument, IrNode } from '../../../ir';
import type { Control, Document } from '../../../jsonui';
import { FORM_EMIT } from '../emit';

/** A form document with the given children on the canvas and nothing else. */
const screenOf = (children: IrNode[]): Document => emit({
  namespace: 'core_ui_test',
  collection: FORM_COLLECTION,
  entity: '',
  root: { kind: 'panel', name: 'root', rect: { x: 0, y: 0, width: 320, height: 210 }, children },
  allocation: { sentinels: 0, drawn: 0, channels: 0, size: 0 },
} satisfies IrDocument, FORM_EMIT);

const definition = (document: Document, name: string): Control => {
  const found = document[name];

  if (found === undefined || typeof found === 'string' || 'modifications' in found) {
    throw new Error(`no definition named ${name}`);
  }

  return found;
};

/** The single entry in a `controls` list, and the name it was mounted under. */
const only = (control: Control): [string, Control] => {
  const [entry] = control.controls ?? [];
  const [name, child] = Object.entries(entry ?? {})[0] ?? [];

  if (name === undefined || child === undefined) {
    throw new Error('expected exactly one child control');
  }

  return [name, child];
};

const button = (address: number): IrNode => ({
  kind: 'button',
  name: 'button_1',
  rect: { x: 4, y: 8, width: 60, height: 20 },
  address,
  face: {
    texture: 'textures/ui/a',
    hover: 'textures/ui/b',
    pressed: 'textures/ui/c',
    disabled: 'textures/ui/d',
  },
  children: [],
});

const text = (address: number): IrNode => ({
  kind: 'text',
  name: 'text_1',
  rect: { x: 0, y: 0, width: 40, height: 10 },
  address,
  length: 12,
  fontType: 'default',
  fontScaleFactor: 1,
});

describe('a form button', () => {
  const document = screenOf([button(2)]);
  const host = definition(document, 'screen').controls?.[0]?.['button_1'];

  it('reads its entry through a one-child host, because the index goes nowhere else', () => {
    expect(host).toMatchObject({ type: 'stack_panel', collection_name: FORM_COLLECTION });

    const [name, cell] = only(host ?? {});

    expect(name).toBe('cell@core_ui_test.button_1');
    expect(cell.collection_index).toBe(2);
  });

  it('carries the collection_details binding ON THE BUTTON — S1: a host above it is not enough', () => {
    const face = definition(document, 'button_1');

    expect(face.type).toBe('button');
    expect(face.bindings).toContainEqual({
      binding_type: 'collection_details',
      binding_collection_name: FORM_COLLECTION,
    });
  });

  it('routes a press to the engine\'s form click', () => {
    expect(definition(document, 'button_1').button_mappings).toContainEqual({
      from_button_id: 'button.menu_select',
      to_button_id: 'button.form_button_click',
      mapping_type: 'pressed',
    });
  });

  it('takes enabled off its own entry, since a form has a string where a chest has an item', () => {
    const face = definition(document, 'button_1');

    expect(face.enabled).toBe('#entry_enabled');
    expect(face.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: "(not (#entry_value = '0'))",
      target_property_name: '#entry_enabled',
    });
  });

  it('lets the engine draw the disabled face rather than gating it', () => {
    const face = definition(document, 'button_1');

    expect(face.locked_control).toBe('locked');
    expect(face.controls?.map(entry => Object.keys(entry)[0])).toEqual(['default', 'hover', 'pressed', 'locked']);
  });

  it('shares one definition between two buttons that look the same', () => {
    const two = screenOf([button(0), { ...button(1), name: 'button_2' } as IrNode]);

    expect(two['button_2']).toBeUndefined();
    expect(only(two['button_1'] as Control)).toBeDefined();
  });
});

describe('a form live text', () => {
  const document = screenOf([text(5)]);

  it('is one label reading its entry — no table, no slicing, no cap', () => {
    const run = definition(document, 'text_1');

    expect(run).toMatchObject({ type: 'label', text: '#entry_value', localize: false });
    expect(run.bindings).toContainEqual({
      binding_name: '#form_button_text',
      binding_name_override: '#entry_value',
      binding_type: 'collection',
      binding_collection_name: FORM_COLLECTION,
    });
  });

  it('mounts through the same index host a button uses', () => {
    const host = definition(document, 'screen').controls?.[0]?.['text_1'];
    const [name, cell] = only(host ?? {});

    expect(name).toBe('cell@core_ui_test.text_1');
    expect(cell.collection_index).toBe(5);
  });

  it('is not pressable: no mappings, and nothing to attribute a press to', () => {
    const run = definition(document, 'text_1');

    expect(run.button_mappings).toBeUndefined();
  });
});

describe('a form screen', () => {
  it('carries no chest chrome: a stray click on a form drops nothing', () => {
    const names = definition(screenOf([button(0)]), 'screen').controls?.map(entry => Object.keys(entry)[0]);

    expect(names).not.toContain('core_ui_click_shield');
  });

  it('draws panels, labels and images with their look, which no host owns', () => {
    const document = screenOf([
      { kind: 'label', name: 'label_1', rect: { x: 0, y: 0, width: 10, height: 10 }, text: 'HI', localize: false, fontType: 'default', fontScaleFactor: 1 },
      { kind: 'image', name: 'image_1', rect: { x: 0, y: 0, width: 8, height: 8 }, texture: 'textures/ui/x' },
    ]);
    const controls = definition(document, 'screen').controls ?? [];

    expect(controls.map(entry => Object.keys(entry)[0])).toEqual(['label_1', 'image_1']);
  });
});

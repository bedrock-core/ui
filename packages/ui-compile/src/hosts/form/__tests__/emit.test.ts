import { FORM_COLLECTION } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import { emit } from '../../../emit';
import { faceOf } from '../../../face';
import type { IrDocument, IrNode } from '../../../ir';
import type { Control, Document } from '../../../jsonui';
import { type ButtonNode, faceSignature } from '../../../nodes/button';
import { faceId } from '../../../nodes/shared';
import { FORM_EMIT } from '../emit';

const irOf = (children: IrNode[]): IrDocument => ({
  namespace: 'core_ui_test',
  collection: FORM_COLLECTION,
  root: { kind: 'panel', name: 'root', rect: { x: 0, y: 0, width: 320, height: 210 }, children },
});

/** A form document with the given children on the canvas and nothing else. */
const screenOf = (children: IrNode[]): Document => emit(irOf(children), FORM_EMIT);

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

const button = (address: number): ButtonNode => ({
  kind: 'button',
  name: 'button_1',
  rect: { x: 4, y: 8, width: 60, height: 20 },
  address,
  children: [
    { kind: 'label', name: 'label_1', rect: { x: 0, y: 0, width: 10, height: 10 }, text: 'go', localize: false, fontType: 'default', fontScaleFactor: 1 },
  ],
  face: {
    texture: 'textures/ui/a',
    hover: 'textures/ui/b',
    pressed: 'textures/ui/c',
    disabled: 'textures/ui/d',
  },
});

const text = (address: number): IrNode => ({
  kind: 'text',
  name: 'text_1',
  rect: { x: 0, y: 0, width: 40, height: 10 },
  address,
  length: 12,
  initial: 'idle',
  localize: false,
  fontType: 'default',
  fontScaleFactor: 1,
});

describe('a form button', () => {
  const document = screenOf([button(2)]);
  const host = definition(document, 'screen').controls?.[0]?.['button_1'];
  const id = faceId('button', faceSignature(button(2)));

  it('reads its entry through a one-child host at the face\'s place, because the index goes nowhere else', () => {
    expect(host).toMatchObject({
      type: 'stack_panel', collection_name: FORM_COLLECTION, offset: [4, 8], size: [60, 20], anchor_from: 'top_left',
    });

    const [name, cell] = only(host ?? {});

    expect(name).toBe('cell@core_ui_test.press_1');
    expect(cell.collection_index).toBe(2);
  });

  it('carries the collection_details binding ON THE BUTTON — S1: a host above it is not enough', () => {
    const states = definition(document, 'press_1_states');

    expect(states.type).toBe('button');
    expect(states.bindings).toContainEqual({
      binding_type: 'collection_details',
      binding_collection_name: FORM_COLLECTION,
    });
  });

  it('routes a press to the engine\'s form click', () => {
    expect(definition(document, 'press_1_states').button_mappings).toContainEqual({
      from_button_id: 'button.menu_select',
      to_button_id: 'button.form_button_click',
      mapping_type: 'pressed',
    });
  });

  it('has no button at all while disabled, because `enabled` does not stop a press', () => {
    // MEASURED in game: a button with `enabled` bound false still handed the
    // press to script, and drew no disabled look. The press surface is gated
    // out instead — the shape the chest host arrived at for the same reason.
    const cell = definition(document, 'press_1');
    const [enabled, disabled] = cell.controls ?? [];

    expect(enabled?.['enabled']?.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: "(not (#entry_value = 'f'))",
      target_property_name: '#visible',
    });
    expect(disabled?.['disabled']?.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: "(#entry_value = 'f')",
      target_property_name: '#visible',
    });

    // Only the enabled branch holds a button; the disabled branch is the
    // disabled face alone.
    expect(JSON.stringify(enabled)).toContain('press_1_states');
    expect(JSON.stringify(disabled)).not.toContain('press_1_states');
    expect(disabled?.['disabled']?.controls).toEqual([{ [`face@core_ui_test_faces.${id}_disabled`]: {} }]);
  });

  it('draws every state through the shared faces, caption inside each', () => {
    const states = definition(document, 'press_1_states');

    // A button draws the child its `*_control` names and nothing else of its
    // own, so each state IS one of the faces, and the caption lives in there.
    expect(states.controls?.map(entry => Object.keys(entry)[0])).toEqual([
      `default@core_ui_test_faces.${id}`,
      `hover@core_ui_test_faces.${id}_hover`,
      `pressed@core_ui_test_faces.${id}_pressed`,
    ]);

    const { faces } = faceOf(irOf([button(2)]));

    for (const state of [id, `${id}_hover`, `${id}_pressed`, `${id}_disabled`]) {
      expect(faces[state]?.controls?.map(child => Object.keys(child)[0]))
        .toEqual(['bg', `caption@core_ui_test_faces.${id}_content`]);
    }

    // Emitted once, referenced by every face.
    expect(faces[`${id}_content`]?.type).toBe('panel');
  });

  it('shares one definition between two buttons that look the same', () => {
    const two = screenOf([button(0), { ...button(1), name: 'button_2' }]);

    expect(two['press_2']).toBeUndefined();
    expect(only(two['press_1'] as Control)).toBeDefined();
  });
});

describe('a form live text', () => {
  const document = screenOf([text(5)]);

  it('is one label reading its entry — no table, no slicing, no cap', () => {
    const run = definition(document, 'text_carrier_1');

    // Localized: a live key resolves on the client, a literal renders as itself.
    expect(run).toMatchObject({ type: 'label', text: '#entry_value', localize: true });
    // The value rides the entry's icon path: one plain collection binding, no expression.
    expect(run.bindings).toContainEqual({
      binding_name: '#form_button_texture',
      binding_name_override: '#entry_value',
      binding_type: 'collection',
      binding_collection_name: FORM_COLLECTION,
    });
  });

  it('mounts through the same index host a button uses, at the face\'s place', () => {
    const host = definition(document, 'screen').controls?.[0]?.['text_1'];
    const [name, cell] = only(host ?? {});

    expect(host).toMatchObject({ offset: [0, 0], size: [40, 10], anchor_from: 'top_left' });
    expect(name).toBe('cell@core_ui_test.text_carrier_1');
    expect(cell.collection_index).toBe(5);
  });

  it('draws the string the build rendered with as its face', () => {
    const [entry] = definition(faceOf(irOf([text(5)])).document, 'screen').controls ?? [];

    expect(entry?.['text_1']).toMatchObject({ type: 'label', text: 'idle', localize: false, size: [40, 10] });
    expect(entry?.['text_1']?.bindings).toBeUndefined();
  });

  it('is not pressable: no mappings, and nothing to attribute a press to', () => {
    const run = definition(document, 'text_carrier_1');

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

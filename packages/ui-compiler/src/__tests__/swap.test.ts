import { describe, expect, it } from 'vitest';
import { emit as emitDocument } from '../emit';
import { FORM_EMIT } from '../hosts/form/emit';
import type { IrDocument, IrNode } from '../ir';
import type { LookNode } from '../nodes/primitives/swap';
import type { Control, Document } from '../jsonui';
import { definition, find } from '../__fixtures__/helpers';

const emit = (doc: IrDocument): Document => emitDocument(doc, FORM_EMIT);

const label = (name: string, text: string): IrNode =>
  ({ kind: 'text', name, rect: { x: 0, y: 0, width: 100, height: 10 }, text, localize: false, fontType: 'default', fontScaleFactor: 1 });

const look = (name: string, state: 'on' | 'off' | 'onHover', children: IrNode[]): LookNode =>
  ({ kind: 'look', name, rect: { x: 0, y: 0, width: 100, height: 20 }, state, children });

/** A swap with two looks, and a row that follows it. */
const screenOf = (): IrDocument => ({
  namespace: 'core_ui_test',
  collection: 'form_buttons',
  root: {
    kind: 'panel',
    name: 'root',
    rect: { x: 0, y: 0, width: 320, height: 210 },
    children: [
      {
        kind: 'swap',
        name: 'swap_1',
        rect: { x: 4, y: 8, width: 100, height: 20 },
        id: 'fold',
        group: 'fold',
        exclusive: false,
        on: true,
        looks: [
          look('look_on', 'on', [label('open', '-')]),
          look('look_off', 'off', [label('closed', '+')]),
        ],
      },
      { ...label('rows', 'a'), follows: 'fold' },
    ],
  },
});

const controls = (control: Control): Record<string, Control>[] =>
  (control.controls ?? []) as Record<string, Control>[];

describe('a swap', () => {
  const doc = emit(screenOf());
  const [, control] = find(doc, name => name === 'core_ui_test_fold');
  const swap = (): Control => control;

  it('carries the screen in its name, so another screen never answers for it', () => {
    expect(swap().type).toBe('toggle');
    expect(swap().toggle_name).toBe('core_ui_test_fold');
  });

  it('defines all eight states, which is what stops it vanishing on hover', () => {
    const control = swap();
    const named = [
      control.checked_control, control.unchecked_control,
      control.checked_hover_control, control.unchecked_hover_control,
      control.checked_locked_control, control.unchecked_locked_control,
      control.checked_locked_hover_control, control.unchecked_locked_hover_control,
    ];

    expect(named.filter(name => typeof name === 'string')).toHaveLength(8);

    const drawn = controls(control).flatMap(entry => Object.keys(entry));

    for (const name of named) {
      expect(drawn).toContain(name);
    }
  });

  it('takes a press, without which it draws but never swaps', () => {
    expect(swap().toggle_on_button).toBe('toggle.toggle_on');
    expect(swap().toggle_off_button).toBe('toggle.toggle_off');
    expect(swap().button_mappings).toHaveLength(2);
  });

  it('emits each look once, named by every state that draws it', () => {
    expect(definition(doc, 'swap_1_on')).toBeDefined();
    expect(definition(doc, 'swap_1_off')).toBeDefined();

    // A state with no look of its own falls back to its own side's resting one,
    // so the hover states mount the same definition rather than a copy.
    const mounted = (state: string): string | undefined => {
      const entry = controls(swap()).find(row => state in row);

      return Object.keys(controls((entry ?? {})[state] ?? {})[0] ?? {})[0];
    };

    expect(mounted('checked')).toBe('look@core_ui_test.swap_1_on');
    expect(mounted('checked_hover')).toBe('look@core_ui_test.swap_1_on');
    expect(mounted('unchecked_hover')).toBe('look@core_ui_test.swap_1_off');
  });
});

describe('a follow the screen cannot resolve', () => {
  it('is refused at build, because an unresolved name asserts in the client', () => {
    const orphan = screenOf();

    orphan.root.children = [{ ...label('rows', 'a'), follows: 'nothing_here' }];

    expect(() => emit(orphan)).toThrow(/no control on this screen is called/);
  });
});

describe('a control that follows a swap', () => {
  const doc = emit(screenOf());
  const [, row] = find(doc, name => name === 'rows');
  const rows = (): Control => row;

  it('reads the swap back among its siblings, seeded so it does not flash', () => {
    expect(rows().visible).toBe('#visible');
    expect(rows().property_bag).toEqual({ '#visible': true });
    expect(rows().bindings).toEqual([{
      binding_type: 'view',
      source_control_name: 'core_ui_test_fold',
      source_property_name: '#toggle_state',
      target_property_name: '#visible',
    }]);
  });
});

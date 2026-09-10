import { describe, expect, it } from 'vitest';
import { emit as emitDocument } from '../emit';
import { FORM_EMIT } from '../hosts/form/emit';
import type { IrDocument, IrNode } from '../ir';
import type { LookNode } from '../nodes/primitives/swap';
import type { Control, Document } from '../jsonui';
import { child, definition, entries, find } from '../__fixtures__/helpers';

const emit = (doc: IrDocument): Document => emitDocument(doc, FORM_EMIT);

const label = (name: string, y: number, text: string): IrNode =>
  ({ kind: 'text', name, rect: { x: 0, y, width: 100, height: 10 }, text, localize: false, fontType: 'default', fontScaleFactor: 1 });

const look = (name: string, state: 'on' | 'off', children: IrNode[]): LookNode =>
  ({ kind: 'look', name, rect: { x: 0, y: 0, width: 100, height: 20 }, state, children });

/**
 * A column of a row, a fold of two rows, and a row after it.
 *
 * The fold is what `<Disclosure>` lowers to: a stack holding a swap and a
 * panel that follows it, with no kind of its own.
 */
const screenOf = (): IrDocument => ({
  namespace: 'core_ui_test',
  collection: 'form_buttons',
  root: {
    kind: 'panel',
    name: 'root',
    rect: { x: 0, y: 0, width: 320, height: 210 },
    children: [{
      kind: 'panel',
      name: 'column',
      stack: true,
      rect: { x: 0, y: 0, width: 100, height: 80 },
      children: [
        label('before', 0, 'before'),
        {
          kind: 'panel',
          name: 'fold',
          stack: true,
          rect: { x: 0, y: 12, width: 100, height: 44 },
          children: [
            {
              kind: 'swap',
              name: 'head',
              rect: { x: 0, y: 0, width: 100, height: 20 },
              layer: 1,
              id: 'section',
              group: 'section',
              exclusive: false,
              on: false,
              looks: [
                look('head_on', 'on', [label('open', 0, '-')]),
                look('head_off', 'off', [label('closed', 0, '+')]),
              ],
            },
            {
              kind: 'panel',
              name: 'rows',
              stack: true,
              follows: 'section',
              rect: { x: 0, y: 20, width: 100, height: 24 },
              children: [label('row_a', 0, 'a'), label('row_b', 12, 'b')],
            },
          ],
        },
        label('after', 60, 'after'),
      ],
    }],
  },
});

describe('a fold', () => {
  const doc = emit(screenOf());
  const [, column] = find(doc, name => name === 'column');
  const names = (control: Control): string[] => entries(control).map(([name]) => name);

  it('turns the column that holds it into a stack of pitched rows', () => {
    expect(column.type).toBe('stack_panel');
    expect(column.size).toEqual([100, '100%c']);
    expect(names(column)).toEqual(['before_row', 'fold_row', 'fold_gap', 'after_row']);
    expect(child(column, 'before_row').size).toEqual([100, 12]);
    // The folding row is as tall as its state; the gap after it is its own spacer.
    expect(child(column, 'fold_row').size).toEqual([100, '100%c']);
    expect(child(column, 'fold_gap').size).toEqual([100, 4]);
    expect(child(column, 'after_row').size).toEqual([100, 10]);
  });

  it('is a stack of the header swap and the rows that read its state', () => {
    const fold = child(child(column, 'fold_row'), 'fold');
    const head = child(child(fold, 'head_row'), 'core_ui_test_section');
    const rows = child(child(fold, 'rows_row'), 'rows');

    expect(fold.type).toBe('stack_panel');
    // Its children are stack rows like any other stack's: the header at its
    // own height, the rows content-sized so folding them moves what is below.
    expect(names(fold)).toEqual(['head_row', 'rows_row']);
    expect(child(fold, 'head_row').size).toEqual([100, 20]);
    expect(child(fold, 'rows_row').size).toEqual([100, '100%c']);
    expect(head.type).toBe('toggle');
    expect(head.size).toEqual([100, 20]);
    expect(head.toggle_default_state).toBe(false);
    expect(head.radio_toggle_group).toBeUndefined();
    expect(names(head)).toHaveLength(8);

    expect(rows.type).toBe('stack_panel');
    expect(rows.visible).toBe('#visible');
    expect(rows.property_bag).toEqual({ '#visible': true });
    // Named after the screen, resolved among siblings: another screen's
    // `section`, constructed on the same form, must never be read.
    expect(rows.bindings).toEqual([{
      binding_type: 'view',
      source_control_name: 'core_ui_test_section',
      resolve_sibling_scope: true,
      source_property_name: '#toggle_state',
      target_property_name: '#visible',
    }]);
    // The rows start at the top of their own stack, pitched as laid out.
    expect(names(rows)).toEqual(['row_a_row', 'row_b_row']);
    expect(child(rows, 'row_a_row').size).toEqual([100, 12]);
    expect(child(child(rows, 'row_a_row'), 'row_a').offset).toEqual([0, 0]);
  });

  it('bakes each header into the matching states', () => {
    const fold = child(child(column, 'fold_row'), 'fold');
    const head = child(child(fold, 'head_row'), 'core_ui_test_section');

    expect(names(child(head, 'checked'))).toEqual(['look@core_ui_test.head_on']);
    expect(names(child(head, 'unchecked_hover'))).toEqual(['look@core_ui_test.head_off']);
    expect(names(definition(doc, 'head_off'))).toEqual(['closed']);
  });
});

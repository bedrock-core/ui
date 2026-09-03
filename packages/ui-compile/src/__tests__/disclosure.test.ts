import { describe, expect, it } from 'vitest';
import { emit as emitDocument } from '../emit';
import { FORM_EMIT } from '../hosts/form/emit';
import type { IrDocument, IrNode } from '../ir';
import type { Control, Document } from '../jsonui';
import { child, definition, entries, find } from '../__fixtures__/helpers';

const emit = (doc: IrDocument): Document => emitDocument(doc, FORM_EMIT);

const label = (name: string, y: number, text: string): IrNode =>
  ({ kind: 'label', name, rect: { x: 0, y, width: 100, height: 10 }, text, localize: false, fontType: 'default', fontScaleFactor: 1 });

/** A column of a row, a disclosure of two rows, and a row after it. */
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
          kind: 'disclosure',
          name: 'disclosure_1',
          rect: { x: 0, y: 12, width: 100, height: 44 },
          headerHeight: 20,
          defaultOpen: false,
          headerOpen: [label('open', 0, '-')],
          headerClosed: [label('closed', 0, '+')],
          rows: [label('row_a', 20, 'a'), label('row_b', 32, 'b')],
        },
        label('after', 60, 'after'),
      ],
    }],
  },
});

describe('a disclosure', () => {
  const doc = emit(screenOf());
  const [, column] = find(doc, name => name === 'column');
  const names = (control: Control): string[] => entries(control).map(([name]) => name);

  it('turns the column that holds it into a stack of pitched rows', () => {
    expect(column.type).toBe('stack_panel');
    expect(column.size).toEqual([100, '100%c']);
    expect(names(column)).toEqual(['before_row', 'disclosure_1_row', 'disclosure_1_gap', 'after_row']);
    expect(child(column, 'before_row').size).toEqual([100, 12]);
    // The folding row is as tall as its state; the gap after it is its own spacer.
    expect(child(column, 'disclosure_1_row').size).toEqual([100, '100%c']);
    expect(child(column, 'disclosure_1_gap').size).toEqual([100, 4]);
    expect(child(column, 'after_row').size).toEqual([100, 10]);
  });

  it('is a stack of the header toggle and the rows that read its state', () => {
    const disclosure = child(child(column, 'disclosure_1_row'), 'disclosure_1');
    const head = child(disclosure, 'disclosure_1_head');
    const rows = child(disclosure, 'disclosure_1_rows');

    expect(disclosure.type).toBe('stack_panel');
    expect(head.type).toBe('toggle');
    expect(head.size).toEqual([100, 20]);
    expect(head.toggle_default_state).toBe(false);
    expect(head.radio_toggle_group).toBeUndefined();
    expect(names(head)).toHaveLength(8);

    expect(rows.type).toBe('stack_panel');
    expect(rows.visible).toBe('#visible');
    expect(rows.property_bag).toEqual({ '#visible': false });
    expect(rows.bindings).toEqual([{
      binding_type: 'view',
      source_control_name: 'disclosure_1_head',
      source_property_name: '#toggle_state',
      target_property_name: '#visible',
    }]);
    // The rows start at the top of their own stack, pitched as laid out.
    expect(names(rows)).toEqual(['row_a_row', 'row_b_row']);
    expect(child(rows, 'row_a_row').size).toEqual([100, 12]);
    expect(child(child(rows, 'row_a_row'), 'row_a').offset).toEqual([0, 0]);
  });

  it('bakes each header into the matching states', () => {
    const disclosure = child(child(column, 'disclosure_1_row'), 'disclosure_1');
    const head = child(disclosure, 'disclosure_1_head');

    expect(names(child(head, 'checked'))).toEqual(['header@core_ui_test.disclosure_1_open']);
    expect(names(child(head, 'unchecked_hover'))).toEqual(['header@core_ui_test.disclosure_1_closed']);
    expect(definition(doc, 'disclosure_1_open').size).toEqual([100, 20]);
    expect(names(definition(doc, 'disclosure_1_closed'))).toEqual(['closed']);
  });
});

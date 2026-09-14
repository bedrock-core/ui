import { FORM_COUNT_PREFIX } from '@bedrock-core/ui-runtime/compile';
import { entryValueBinding } from './entry';
import type { Connector, ControlEntry } from '../types';

/** A list's payload: which entry the count travels on, and what the build rendered. */
export interface Count {
  /** The entry holding how many rows are real. */
  address: number;
  /** How many the build rendered, so the gates are seeded rather than flashing. */
  initial: number;
  /** How many rows were compiled, which is the largest count a gate has to enumerate. */
  max: number;
}

/**
 * Which counts show a row.
 *
 * ONE entry serves every row: the count travels once as decimal digits, and
 * each gate bakes the ENUMERATION of the counts that show it — row i is
 * visible when the count is any of 'i+1'..'max', as string equalities. Not a
 * numeric comparison: every atom here (`=`, `or`, `not`) is measured in this
 * pack, while an ordering comparison in a runtime binding drew nothing. And
 * equality on the raw string fails CLOSED, since an entry that never resolves
 * matches no term and the row stays hidden.
 */
export const countAmong = (from: number, to: number): string => {
  const terms = Array.from(
    { length: Math.max(0, to - from + 1) },
    (_, offset) => `(#row_count = '${FORM_COUNT_PREFIX}${String(from + offset)}')`,
  );

  return terms.length === 1 ? terms[0] ?? '' : `(${terms.join(' or ')})`;
};

const showsRow = (index: number, max: number): string => countAmong(index + 1, max);

/**
 * A variable count: the rows the face drew, each behind a gate on one entry.
 *
 * The face already drew the stack — every row in a panel one span tall, the
 * surplus hidden — and this makes the stack declare the collection so each row
 * panel, a DIRECT child, can carry the count entry's index and read it back. A
 * stack gives an invisible child no space, measured, static and bound alike,
 * so the rows past the count collapse and the visible ones pack from the top.
 * That is the one place a compiled screen reflows at runtime, and it costs
 * nothing.
 */
export const list: Connector<Count> = (data, face, ctx) => {
  const [key, stack] = Object.entries(face)[0] ?? ['', {}];

  return {
    [key]: {
      ...stack,
      collection_name: ctx.collection,
      controls: (stack.controls ?? []).map((row, index): ControlEntry => {
        const [rowKey, panel] = Object.entries(row)[0] ?? ['', {}];
        const { visible: _visible, ...rest } = panel;

        return {
          [rowKey]: {
            ...rest,
            collection_index: data.address,
            visible: '#visible',
            property_bag: { '#visible': index < data.initial },
            bindings: [
              entryValueBinding('#row_count', ctx.collection),
              {
                binding_type: 'view',
                source_property_name: showsRow(index, data.max),
                target_property_name: '#visible',
              },
            ],
          },
        };
      }),
    },
  };
};

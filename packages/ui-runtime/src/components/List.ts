import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, withControl } from './control';

/**
 * A variable count on a frozen screen.
 *
 * A compiled screen cannot add or drop a row at runtime — the build numbered
 * every cell once — so `<List>` is the one legal way to render "however many
 * there are": `max` copies of the row are compiled, a carried int says how
 * many are real, and the compiled gates hide the rest client-side. The shape
 * never moves; only the count does.
 *
 * The row function is called `max` times on EVERY render, `undefined` beyond
 * the data, which is what makes the shape independent of the data by
 * construction: a row must render the same elements for `undefined` as for an
 * item, with empty values — the same contract a probe would otherwise refuse.
 * Values that differ per item inside a row travel like any other live value
 * (`maxLength` text, `visible`); a baked string fed from item data stays the
 * build's value, which `debug` reports.
 *
 * Hidden rows take no space: the list compiles to a stack panel, which gives
 * an invisible child no room, so the visible rows pack from the top and a
 * scroll over the list scrolls exactly as far as the real rows — the one
 * runtime reflow a compiled screen has, and it is the engine's own.
 *
 * Items beyond `max` are not shown and not carried. `max` is the screen's
 * honest capacity, the way `maxLength` is a string's.
 */

/** Host type for the list container. Laid out as a flex column; lowered by the compiler. */
export const LIST_SLOT_TYPE = 'list-slot';

export interface ListProps<T> extends ControlProps {
  /** How many rows are compiled. The screen's capacity, declared. */
  max: number;
  /** The data. Only the first `max` are shown; the count travels as one int. */
  items: readonly T[];
  /**
   * One row. Called for every compiled slot with the item at that index, or
   * `undefined` past the data — return the same elements either way, with
   * empty values, so the shape holds still.
   */
  row: (item: T | undefined, index: number) => JSX.Element;
  children?: never;
}

/**
 * How many rows are real this render — what the int entry carries.
 * Exposed for the hosts; reads the element the way `liveTextLength` does.
 */
export function listCount(element: JSX.Element): number | undefined {
  if (element.type !== LIST_SLOT_TYPE) {
    return undefined;
  }

  const { count } = element.props;

  return typeof count === 'number' ? count : undefined;
}

/**
 * Characters the count's carrier reserves: the digits of `max`. Also how a
 * walk recognises a list — present exactly on `<List>` elements, the way
 * `maxLength` marks live text.
 */
export function listCapacity(element: JSX.Element): number | undefined {
  if (element.type !== LIST_SLOT_TYPE) {
    return undefined;
  }

  const { max } = element.props;

  return typeof max === 'number' && max >= 1 ? String(Math.floor(max)).length : undefined;
}

const ListRoot = <T>({ max, items, row, ...layout }: ListProps<T>): JSX.Element => {
  const capacity = Math.max(1, Math.floor(max));

  return {
    type: LIST_SLOT_TYPE,
    props: {
      ...withControl({ flexDirection: 'column', ...layout }),
      max: capacity,
      count: Math.min(items.length, capacity),
      // Every slot, every render: the shape cannot depend on the data.
      children: Array.from({ length: capacity }, (_, index) => row(items[index], index)),
    },
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- a generic component erases to this for JSX use
export const List: FunctionComponent<ListProps<any>> = ListRoot;

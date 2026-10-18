import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, withControl } from './control';

/** A fixed panel controlled by a native selection group. */
export const SELECTION_PAGE_SLOT_TYPE = 'selection-page-slot';

export type SelectionPanelProps = ControlProps & {
  readonly group: string;
  readonly children?: JSX.Node;
  /** Server-confirmed membership within a fixed, compiled universe of indexes. */
  readonly activeIndexes?: readonly number[];
} & ({ readonly index: number; readonly indexes?: never } | { readonly indexes: readonly number[]; readonly index?: never });

/** Keeps content mounted while a native group selects which fixed panel is visible. */
export const SelectionPanel: FunctionComponent<SelectionPanelProps> = ({ group, index, indexes, activeIndexes, children, ...layout }): JSX.Element => ({
  type: SELECTION_PAGE_SLOT_TYPE,
  props: { ...withControl(layout), selectionGroup: group, selectionIndex: index, selectionIndexes: indexes,
    ...activeIndexes === undefined
      ? {}
      : {
          selectionActiveIndexes: activeIndexes,
          // Keep string subtraction results textual in Bedrock's expression evaluator.
          value: { tail: `m|${activeIndexes.join('|')}|` },
        }, children },
});

/** A compact membership carrier, shared by allocation and lowering. */
export function selectionMaskLength(element: JSX.Element): number | undefined {
  if (element.type !== SELECTION_PAGE_SLOT_TYPE || !Array.isArray(element.props.selectionActiveIndexes)) { return undefined; }

  const indexes: unknown = element.props.selectionIndexes ?? [element.props.selectionIndex];

  if (!Array.isArray(indexes)) { throw new Error('Selection indexes must be a fixed array.'); }

  return 3 + indexes.reduce<number>((length, index: unknown) => length + String(index).length + 1, 0);
}

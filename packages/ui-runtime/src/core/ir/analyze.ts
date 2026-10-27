import { textLimit } from '../../components/Text';
import { hasTextChannel, textChannelsAt } from './text';
import { selectionMaskLength } from '../../components/Selection';
import { childElements } from '../guards';
import type { JSX } from '../../jsx';
import type { VariantTable } from './probe';

/** Channels detected by the compiler and the runtime values that occupy them. */
export interface Analysis {
  /** Characters reserved for each live label. */
  readonly texts: ReadonlyMap<JSX.Element, number>;
  /**
   * Elements whose `visible` the probes saw move, so a host must carry it.
   *
   * Unlike a live label this cannot be read off the element: `withControl`
   * stamps `visible: true` on everything and the inherit pass forces `false`
   * down a hidden subtree, so the prop's presence says nothing about the
   * author. The BUILD learns it by probing and hands the runtime the element
   * positions through the compiled snapshot — which is the same contract live
   * text has, with the snapshot standing where `maxLength` stands.
   */
  readonly visibles: ReadonlySet<JSX.Element>;
  /**
   * Elements whose baked props follow state, with the looks each one takes.
   *
   * Read the same way `visibles` is: the BUILD probes for them and hands the
   * runtime the element positions through the compiled snapshot, because a
   * look that moves cannot be read off an element any more than a carried
   * `visible` can.
   */
  readonly variants: ReadonlyMap<JSX.Element, VariantTable>;
}

export const analyze = (
  tree: JSX.Element,
  visibles: ReadonlySet<JSX.Element> = new Set(),
  variants: ReadonlyMap<JSX.Element, VariantTable> = new Map(),
  positions?: readonly number[],
): Analysis => {
  if (positions !== undefined) { textChannelsAt(tree, positions); }

  const texts = new Map<JSX.Element, number>();

  const visit = (element: JSX.Element): void => {
    const length = (hasTextChannel(element) ? textLimit(element) : undefined) ?? selectionMaskLength(element);

    if (length !== undefined) {
      texts.set(element, length);
    }

    for (const child of childElements(element.props.children)) {
      visit(child);
    }
  };

  visit(tree);

  return { texts, visibles, variants };
};

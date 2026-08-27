import { liveTextLength } from '../../components/Text';
import { childElements } from '../guards';
import type { JSX } from '../../jsx';

/**
 * What in a built tree is live: decided once, the same way, by the build and
 * by the runtime.
 *
 * A compiled layout is frozen, so anything that changes after the build has to
 * be known before it — a live label reserves container slots. Today that
 * knowledge is explicit, `<Text maxLength>`, and this pass only collects it. It
 * is a pass rather than a predicate because it is where inference goes next:
 * the build runs real fibers, so it can re-render with each state slot
 * perturbed and diff the trees, marking whatever moved as live without the
 * author saying so.
 */
export interface Analysis {
  /** Characters reserved for each live label. */
  readonly texts: ReadonlyMap<JSX.Element, number>;
}

export const analyze = (tree: JSX.Element): Analysis => {
  const texts = new Map<JSX.Element, number>();

  const visit = (element: JSX.Element): void => {
    const length = liveTextLength(element);

    if (length !== undefined) {
      texts.set(element, length);
    }

    for (const child of childElements(element.props.children)) {
      visit(child);
    }
  };

  visit(tree);

  return { texts };
};

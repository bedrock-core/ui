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
}

export const analyze = (tree: JSX.Element, visibles: ReadonlySet<JSX.Element> = new Set()): Analysis => {
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

  return { texts, visibles };
};

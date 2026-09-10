import { childElements } from '../core/guards';
import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, withControl } from './control';

/**
 * A look the client swaps by itself.
 *
 * The one mechanism a compiled screen owns outright: a toggle changes its own
 * content with nothing reaching script, on the pack's own form mount and under
 * the modification-inserted chest mount alike. A tab change, a fold, a choice
 * between options: none of them costs a press, a re-present or a payload.
 *
 * It is named for what it DOES rather than for the arrangement it happens to
 * be in. The same swap is a row of tabs, a column of radio rows, a strip of
 * segments, or a section that folds — what differs is where the looks are put
 * and what they draw, and that is the caller's.
 *
 * Everything a look holds is drawn INSIDE the state that names it, so content
 * exists in the tree exactly while its state is the current one and nothing
 * outside the swap has to observe which that is. The one exception is
 * {@link SwapProps.id}: a control that cannot live inside a look — a fold's
 * rows, which have to reflow what is under them — reads the swap back by name
 * instead.
 *
 * Compiled-only: on a serialized screen a swap would be a re-render, which
 * `useState` already does for nothing.
 *
 * @internal Reached through `<Tabs>` and `<Disclosure>`.
 */

/** Host type for the swap. Lowered to a JSON UI toggle. */
export const SWAP_SLOT_TYPE = 'swap-slot';

/** Host type for one look. Laid out so its children get rects; drawn inside the toggle. */
export const SWAP_LOOK_SLOT_TYPE = 'swap-look-slot';

/**
 * The eight states a toggle can be in.
 *
 * Only `on` and `off` need a look: a state left out falls back to its own
 * side's resting one, which is what a control with no hover art wants. The
 * engine draws the one its current state names and NOTHING else, so all eight
 * are always defined — a look left undefined is a control that vanishes the
 * moment it enters that state.
 */
export type SwapState
  = 'on' | 'onHover' | 'onLocked' | 'onLockedHover'
    | 'off' | 'offHover' | 'offLocked' | 'offLockedHover';

export interface SwapLookProps extends ControlProps {
  /** Which state draws this look. */
  state: SwapState;
  /**
   * The `id` of a sibling of this look's SWAP, drawn inside this state.
   *
   * For content too big to be solved inside the swap: a tab's pane is the
   * whole box below the headers, so the layout places it beside them and the
   * compile moves it in. Still drawn inside the state, so a pane whose tab is
   * not chosen is never built.
   */
  draws?: string;
  children?: JSX.Node;
}

export interface SwapProps extends ControlProps {
  /**
   * What a `follows` names this swap by, unique within the screen.
   *
   * The compile mints one when this is absent, which is what a fold wants: its
   * rows follow the swap right before them and never name it. Either way the
   * compile qualifies the id with the screen's namespace before it reaches
   * JSON UI — a `source_control_name` is looked up screen-wide, and every
   * gated compiled screen is constructed on every form open, so an unqualified
   * name would let another addon's screen answer for this one.
   */
  id?: string;
  /**
   * Swaps sharing a group move together. Defaults to this swap's own id, which
   * is a group of one.
   */
  group?: string;
  /** Which member of the group this is, when only one of them may be on. */
  index?: number;
  /** Whether turning this one on turns the rest of its group off. */
  exclusive?: boolean;
  /** Which state the screen opens in. Off by default. */
  defaultOn?: boolean;
  children?: JSX.Node;
}

/**
 * One look.
 *
 * Fills its swap, because a toggle's states are the same box drawn different
 * ways; where that box sits is the swap's own layout.
 */
const Look: FunctionComponent<SwapLookProps> = (
  { state, draws, children, ...layout }: SwapLookProps,
): JSX.Element => ({
  type: SWAP_LOOK_SLOT_TYPE,
  props: {
    ...withControl({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, ...layout }),
    // Carried beside the control block rather than through it: `withControl`
    // returns only the props it knows, so a component's own prop has to be
    // added back or it never reaches the compiler.
    state,
    draws,
    children,
  },
});

const isLook = (element: JSX.Element): boolean => {
  // A child of `<Swap>` has not been expanded yet, so its `type` is the Look
  // FUNCTION; after expansion it is the host string. Accept both.
  const { type } = element;

  return type === SWAP_LOOK_SLOT_TYPE || type === (Look as unknown);
};

const SwapRoot: FunctionComponent<SwapProps> = (
  { id, group, index, exclusive, defaultOn, children, ...layout }: SwapProps,
): JSX.Element => ({
  type: SWAP_SLOT_TYPE,
  props: {
    ...withControl(layout),
    id,
    group,
    index,
    exclusive,
    defaultOn,
    children: childElements(children).filter(isLook),
  },
});

interface SwapComponent extends FunctionComponent<SwapProps> {
  Look: FunctionComponent<SwapLookProps>;
}

/** Assembled with `Object.assign` so the namespace is built structurally, as `Tabs` is. */
export const Swap: SwapComponent = Object.assign(SwapRoot, { Look });

import { childElements } from '../core/guards';
import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, withControl } from './control';

/**
 * Tabs: several panes on ONE screen, switched without the server hearing about it.
 *
 * MEASURED (spike S4): a radio toggle group swaps its content with nothing
 * reaching script — no press, no re-present, no payload — on the pack's own
 * form mount AND under the modification-inserted chest mount. So a tab change
 * costs nothing at runtime, whichever screen it is drawn on.
 *
 * That is the whole reason this is a component rather than navigation. A
 * `navigation.navigate()` is a state change: it rebuilds the tree and presents
 * again, which S5 priced at 14 ms of server work for 50 cells and 53 ms for
 * 200. Tabs pay none of it. Routing them through the navigator would have
 * built the expensive version of a thing that can be free.
 *
 * What you give up for that is exactly what "the server never hears it" means:
 * no handler runs on a switch, and nothing outside the group can know which
 * tab is open. A tab whose content depends on the switch is a screen change,
 * not a tab.
 *
 * ## What it costs instead
 *
 * Every tab's content is in the tree at once, so N tabs draw N times the
 * controls. On a COMPILED screen that is paid in pack size and nothing at
 * runtime, which is what makes tabs essentially free however many there are.
 * On a serialized screen it would be N times the payload on every present —
 * which is why this is compiled-only for now, and says so at build.
 */

/** Host type for the tab group. Transparent: laid out, then lowered by the compiler. */
export const TABS_SLOT_TYPE = 'tabs-slot';

/** Host type for one pane. Laid out so its children get rects; drawn by its tab's face. */
export const TAB_SLOT_TYPE = 'tab-slot';

/** The height of the header row, in texels, when a `<Tabs>` does not say. */
export const DEFAULT_TAB_HEIGHT = 20;

export interface TabProps extends ControlProps {
  /** What the tab's header reads. */
  label: string;
  /**
   * The header's face while this tab is the chosen one.
   *
   * `background` styles the other state. Both default to unstyled, and one
   * given alone styles the tab in both states — the same `state ?? base` rule a
   * `Button` face follows.
   */
  backgroundSelected?: string;
  children?: JSX.Node;
}

export interface TabsProps extends ControlProps {
  /** Height of the header row. The panes take what is left. */
  tabHeight?: number;
  children?: JSX.Node;
}

/**
 * One pane.
 *
 * Positioned absolutely by {@link Tabs} rather than by the author: every pane
 * occupies the same rect — the group's box below the headers — because only
 * one of them is ever drawn. Laying them out in flow would stack them down the
 * screen and leave the group as tall as all its tabs put together.
 */
const Tab: FunctionComponent<TabProps> = (
  { label, backgroundSelected, children, ...layout }: TabProps,
): JSX.Element => ({
  type: TAB_SLOT_TYPE,
  props: {
    ...withControl(layout),
    label,
    // Carried explicitly. `withControl` returns only the props it knows, so
    // anything a component adds of its own is DROPPED silently by passing
    // through it — which is why the selected face never reached the compiler
    // and the chosen tab drew blank.
    backgroundSelected,
    children,
  },
});

const isTab = (element: JSX.Element): boolean => {
  // A child of `<Tabs>` has not been expanded yet, so its `type` is the Tab
  // FUNCTION; after expansion it is the host string. Accept both, the way
  // `isOptionElement` does for `Form.Option`.
  const { type } = element;

  return type === TAB_SLOT_TYPE || type === (Tab as unknown);
};

/**
 * The group.
 *
 * Its children are `<Tabs.Tab>`s and nothing else. Each is re-positioned here,
 * so the pane rects are the group's own arithmetic rather than something every
 * author has to get right: absolute, inset from the top by the header height,
 * filling the rest.
 */
const TabsRoot: FunctionComponent<TabsProps> = (
  { tabHeight = DEFAULT_TAB_HEIGHT, children, ...layout }: TabsProps,
): JSX.Element => ({
  type: TABS_SLOT_TYPE,
  props: {
    ...withControl({ flexDirection: 'column', ...layout }),
    tabHeight,
    children: childElements(children)
      .filter(isTab)
      .map(tab => ({
        ...tab,
        props: {
          ...tab.props,
          // RAW props, not a `withControl` block.
          //
          // A `<Tabs.Tab>` child is still UNEXPANDED here — `Tab` has not been
          // called — so anything nested into `__layout` now is thrown away when
          // it is: `Tab` reads `position`/`top`/… off its own props and builds
          // its own block. Handing it a finished block instead lost the
          // positioning entirely, and the panes stacked down the screen.
          //
          // `top` + `bottom` with no `height` is what makes every pane exactly
          // the box below the headers: the solver derives the height from the
          // insets, and `FlexSize` offers no arithmetic to say it directly.
          position: 'absolute',
          left: 0,
          right: 0,
          top: tabHeight,
          bottom: 0,
        },
      })),
  },
});

interface TabsComponent extends FunctionComponent<TabsProps> {
  Tab: FunctionComponent<TabProps>;
}

/**
 * Assembled with `Object.assign` so the namespace shape is built structurally,
 * the same way `Form` is.
 */
export const Tabs: TabsComponent = Object.assign(TabsRoot, { Tab });

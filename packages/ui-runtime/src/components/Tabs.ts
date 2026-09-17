import { childElements } from '../core/guards';
import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, UNSTYLED_TEXTURE, withControl } from './control';
import { PANEL_TYPE } from './Panel';
import { Swap } from './Swap';

/**
 * Tabs: several panes on ONE screen, switched without the server hearing about it.
 *
 * Each tab is a {@link Swap} in the row of headers, and its pane is DRAWN
 * INSIDE the chosen look. That asymmetry is the feature: the pane exists in
 * the tree exactly while its tab is the chosen one, so nothing outside the
 * toggle observes which tab is open, nothing has to be told when it changes,
 * and a pane that is not showing is never built — which is what keeps an
 * engine field inside a tab off a collection row that is not there.
 *
 * The panes are laid out beside the headers, filling the box below them,
 * because that is where a pane belongs and one header cell is not big enough
 * to solve it in. The compile re-bases each into its swap.
 *
 * That is why this is a component rather than navigation. A
 * `navigation.navigate()` is a state change: it rebuilds the tree and presents
 * again, which measures 14 ms of server work for 50 cells and 53 ms for 200.
 * Tabs pay none of it.
 *
 * What you give up is exactly what "the server never hears it" means: no
 * handler runs on a switch, and nothing outside the group can know which tab
 * is open. A tab whose content depends on the switch is a screen change, not a
 * tab.
 *
 * ## What it costs instead
 *
 * Every tab's content is in the tree at once, so N tabs draw N times the
 * controls. On a COMPILED screen that is paid in pack size and nothing at
 * runtime, which is what makes tabs essentially free however many there are.
 * On a serialized screen it would be N times the payload on every present,
 * which is why this is compiled-only and says so at build.
 */

/** The height of the header row, in texels, when a `<Tabs>` does not say. */
export const DEFAULT_TAB_HEIGHT = 20;

export interface TabProps extends ControlProps {
  /** The header while this tab is not the chosen one, drawn by the author. */
  header: JSX.Element;
  /** The header while it is; `header` when absent. */
  headerSelected?: JSX.Element;
  children?: JSX.Node;
}

export interface TabsProps extends ControlProps {
  /** Height of the header row. The panes take what is left. */
  tabHeight?: number;
  /** The face every header is drawn on while its tab is not chosen. */
  tabBackground?: string;
  /** The face while the pointer is over a tab that is not chosen. Falls back to `tabBackground`. */
  tabHover?: string;
  /** The face while its tab is the chosen one. Falls back to `tabBackground`. */
  tabSelected?: string;
  children?: JSX.Node;
}

/** Host type for one tab. A marker its group reads; it never reaches the compiler. */
export const TAB_SLOT_TYPE = 'tab-slot';

/**
 * One tab.
 *
 * A marker rather than an element of its own: `<Tabs>` takes the two looks and
 * the pane apart and builds the swap around them, so nothing of this reaches
 * the compile. A `<Tabs.Tab>` written outside a `<Tabs>` is refused there, by
 * its type.
 */
const Tab: FunctionComponent<TabProps> = (
  { header, headerSelected, children }: TabProps,
): JSX.Element => ({ type: TAB_SLOT_TYPE, props: { header, headerSelected, children } });

const isTab = (element: JSX.Element): boolean => {
  // A child of `<Tabs>` has not been expanded yet, so its `type` is the Tab
  // FUNCTION; after expansion it is the host string. Accept both.
  const { type } = element;

  return type === TAB_SLOT_TYPE || type === (Tab as unknown);
};

/** What a look names the pane beside it by. Only its siblings ever resolve it. */
const paneId = (index: number): string => `pane_${String(index)}`;

/** A tab's props arrive as the author wrote them, so each look is read back by shape. */
const isElement = (value: unknown): value is JSX.Element =>
  typeof value === 'object' && value !== null && 'type' in value && 'props' in value;

/** The look a tab draws in one state, falling back to its resting one. */
const lookOf = (tab: JSX.Element, state: 'header' | 'headerSelected'): JSX.Node => {
  const drawn = tab.props[state];

  return isElement(drawn) ? drawn : lookOf(tab, 'header');
};

/** A header drawn on a face: the look fills the tab, and the author's header sits on it. */
const onFace = (background: string, header: JSX.Node): JSX.Element => ({
  type: PANEL_TYPE,
  props: {
    ...withControl({ width: '100%', height: '100%', background }),
    children: header,
  },
});

const TabsRoot: FunctionComponent<TabsProps> = (
  { tabHeight = DEFAULT_TAB_HEIGHT, tabBackground, tabHover, tabSelected, children, ...layout }: TabsProps,
): JSX.Element => {
  const tabs = childElements(children).filter(isTab);
  // Unstyled unless the author says otherwise: the library ships no look of its own.
  const rest = tabBackground ?? UNSTYLED_TEXTURE;

  return {
    type: PANEL_TYPE,
    props: {
      // The headers share the width evenly; the panes are out of that flow.
      ...withControl({ flexDirection: 'row', ...layout }),
      children: [
        ...tabs.map((tab, index): JSX.Element => Swap({
          index,
          exclusive: true,
          // Above the panes, which reach under the headers beside their own.
          zIndex: 1,
          flexGrow: 1,
          height: tabHeight,
          children: [
            Swap.Look({ state: 'off', children: onFace(rest, lookOf(tab, 'header')) }),
            Swap.Look({ state: 'offHover', children: onFace(tabHover ?? rest, lookOf(tab, 'header')) }),
            Swap.Look({ state: 'on', draws: paneId(index), children: onFace(tabSelected ?? rest, lookOf(tab, 'headerSelected')) }),
          ],
        })),
        ...tabs.map((tab, index): JSX.Element => ({
          type: PANEL_TYPE,
          props: {
            // The whole box below the headers, every pane on the same rect:
            // only one is ever drawn, so laying them in flow would stack them
            // down the screen and make the group as tall as all its tabs.
            ...withControl({ position: 'absolute', left: 0, right: 0, top: tabHeight, bottom: 0 }),
            id: paneId(index),
            children: tab.props.children,
          },
        })),
      ],
    },
  };
};

interface TabsComponent extends FunctionComponent<TabsProps> {
  Tab: FunctionComponent<TabProps>;
}

/** Assembled with `Object.assign` so the namespace is built structurally, as `Form` is. */
export const Tabs: TabsComponent = Object.assign(TabsRoot, { Tab });

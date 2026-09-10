import { childElements } from '../core/guards';
import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, withControl } from './control';
import { PANEL_TYPE } from './Panel';
import { Swap } from './Swap';

/**
 * Disclosure: a header that folds the rows under it, entirely on the client.
 *
 * The header is a {@link Swap} and the rows are a panel that FOLLOWS it —
 * vanilla's own idiom for a section that opens and closes — so a fold costs no
 * press, no re-present and no payload. The rows sit in a stack, and a stack
 * gives a hidden child no space, so everything below moves up when they fold:
 * the one native reflow a frozen screen has, the same one `<List>` is built
 * on.
 *
 * Following rather than nesting is what the reflow costs. Content inside a
 * look has no say over its siblings, so rows that have to push what is under
 * them cannot live there — which is why this is the one place a composition
 * reads a swap back.
 *
 * Two headers, because a fold is the only thing that can tell them apart:
 * `header` draws while the rows show, `headerClosed` while they hide (the
 * first stands in for the second when it is not given). Each is a look, so it
 * may hold anything.
 *
 * Compiled-only, like `<Tabs>`: on a serialized screen the fold would be a
 * re-render, which `useState` already does for nothing.
 */

/** The header's height, in texels, when a `<Disclosure>` does not say. */
export const DEFAULT_DISCLOSURE_HEADER_HEIGHT = 20;

export interface DisclosureProps extends ControlProps {
  /** What the header draws while the rows show. */
  header: JSX.Element;
  /** What it draws while they hide; `header` when absent. */
  headerClosed?: JSX.Element;
  /** Height of the header box. The rows flow below it. */
  headerHeight?: number;
  /** Whether the rows show when the screen opens. Defaults to open. */
  defaultOpen?: boolean;
  children?: JSX.Node;
}

/**
 * The props that describe how CONTENT flows rather than where the box sits.
 *
 * They belong to the panel the rows are in, not to the fold around it: an
 * author writing `gap` on a `<Disclosure>` means the space between its rows,
 * and the rows are one panel further in than they look.
 */
const FLOW = [
  'flexDirection', 'wrap', 'justifyContent', 'alignItems', 'alignContent',
  'gap', 'rowGap', 'columnGap',
] as const;

/** The author's props, split into the fold's box and the rows' flow. */
const split = (layout: JSX.Props): [JSX.Props, JSX.Props] => {
  const isFlow = (prop: string): boolean => (FLOW as readonly string[]).includes(prop);
  const entries = Object.entries(layout);

  return [
    Object.fromEntries(entries.filter(([prop]) => !isFlow(prop))),
    Object.fromEntries(entries.filter(([prop]) => isFlow(prop))),
  ];
};

export const Disclosure: FunctionComponent<DisclosureProps> = (
  { header, headerClosed, headerHeight = DEFAULT_DISCLOSURE_HEADER_HEIGHT, defaultOpen = true, children, ...layout }: DisclosureProps,
): JSX.Element => {
  const [box, flow] = split(layout);

  return {
    type: PANEL_TYPE,
    props: {
      // The rows flow in a column under a top padding the height of the header,
      // which sits absolutely in that padding: one box, header above, rows below.
      ...withControl({ flexDirection: 'column', paddingTop: headerHeight, ...box }),
      // A stack, so the rows folding away moves what is under them.
      stack: true,
      children: [
        Swap({
          defaultOn: defaultOpen,
          // Above the rows, which a header with no background of its own would
          // otherwise be drawn under.
          zIndex: 1,
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: headerHeight,
          children: [
            Swap.Look({ state: 'on', children: header }),
            Swap.Look({ state: 'off', children: headerClosed ?? header }),
          ],
        }),
        {
          type: PANEL_TYPE,
          props: {
            ...withControl({ flexDirection: 'column', ...flow }),
            // The header is the sibling right before this, which is the only
            // thing a sibling lookup can reach.
            stack: true,
            follows: true,
            children: childElements(children),
          },
        },
      ],
    },
  };
};

import { childElements } from '../core/guards';
import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, withControl } from './control';

/**
 * Disclosure: a header that folds the rows under it, entirely on the client.
 *
 * The header is a toggle and the rows read its state — vanilla's own idiom for
 * a section that opens and closes — so a fold costs no press, no re-present
 * and no payload. The rows sit in a stack, and a stack gives a hidden child no
 * space (measured), so everything below moves up when they fold: the ONE
 * native reflow a frozen screen has, the same one `<List>` is built on.
 *
 * Two headers, because a fold is the only thing that can tell them apart:
 * `header` draws while the rows show, `headerClosed` while they hide (the
 * first stands in for the second when it is not given). Each is baked into the
 * toggle's states the way a button's caption is, so it may hold anything.
 *
 * Compiled-only, like `<Tabs>`: on a serialized screen the fold would be a
 * re-render, which `useState` already does for nothing.
 */

/** Host type for the group. Transparent: laid out, then lowered by the compiler. */
export const DISCLOSURE_SLOT_TYPE = 'disclosure-slot';

/** Host type for one header. Laid out so its children get rects; drawn by the toggle's states. */
export const DISCLOSURE_HEADER_SLOT_TYPE = 'disclosure-header-slot';

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

/** One header, as the layout sees it: a box across the top, its content inside. */
const headerSlot = (content: JSX.Element, state: 'open' | 'closed', height: number): JSX.Element => ({
  type: DISCLOSURE_HEADER_SLOT_TYPE,
  props: {
    ...withControl({ position: 'absolute', left: 0, right: 0, top: 0, height }),
    state,
    children: content,
  },
});

export const Disclosure: FunctionComponent<DisclosureProps> = (
  { header, headerClosed, headerHeight = DEFAULT_DISCLOSURE_HEADER_HEIGHT, defaultOpen = true, children, ...layout }: DisclosureProps,
): JSX.Element => ({
  type: DISCLOSURE_SLOT_TYPE,
  props: {
    // The rows flow in a column under a top padding the height of the header,
    // which sits absolutely in that padding: one box, header above, rows below.
    ...withControl({ flexDirection: 'column', paddingTop: headerHeight, ...layout }),
    headerHeight,
    defaultOpen,
    children: [
      headerSlot(header, 'open', headerHeight),
      headerSlot(headerClosed ?? header, 'closed', headerHeight),
      ...childElements(children),
    ],
  },
});

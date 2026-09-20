import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, withControl } from './control';

/** The element type emitted by `<Scroll>`. Transparent: registered without a writer. */
export const SCROLL_SLOT_TYPE = 'scroll-slot';

/** Scroll axis. Only `'y'` is exposed publicly; `'x'` exists for the protocol field. */
export type ScrollAxis = 'x' | 'y';

/**
 * Texels the scrollbar track takes near the right edge of a vertical scroll
 * region (`core_ui_shapes.scroll`). Content is laid out narrower by the track
 * and the clear space either side of it, so its right edge meets the gutter
 * instead of running under the bar and being clipped.
 */
export const SCROLL_TRACK_WIDTH = 5;

/**
 * Clear space either side of the track: between the content and the bar, and
 * between the bar and the region's right edge, the same on both so the bar
 * sits centred in its column. Reserved only where the track is. The render
 * pack's `core_ui_shapes.scroll` insets its viewport and bar by the same
 * numbers.
 */
export const SCROLL_GUTTER = 3;

/** What scrolling content gives up on its right: the track and the space either side of it. */
export const SCROLL_RESERVE = SCROLL_TRACK_WIDTH + 2 * SCROLL_GUTTER;

/**
 * The props the content of a scroll over ONE `<List>` carries beside its
 * layout rect: the same content solved across the whole viewport, with no
 * track. How many rows a list shows is only known when the screen is
 * shown, so the build keeps both widths and the client draws the one the
 * count calls for. `marker` is set on the scroll itself once the wide rects
 * exist.
 */
export const WIDE_RECT = {
  marker: 'jsonUIWide',
  x: 'jsonUIWideX',
  y: 'jsonUIWideY',
  width: 'jsonUIWideWidth',
  height: 'jsonUIWideHeight',
} as const;

/**
 * `<Scroll>` — one independent scroll region. Each `<Scroll>` in a render becomes its own
 * scroll viewport (index 0 is the implicit root) that scrolls vertically.
 *
 * Like every other component, `<Scroll>` accepts the full {@link ControlProps} (flex sizing,
 * `flexGrow`, `margin`, `position`/`top`/`left`, …); those values size and position its
 * **viewport** in the parent's flex flow, exactly like a `<Panel>`. Arrange a group with the
 * parent's `flexDirection`, fix a size with `width`/`height`, or take it out of the flow with
 * `position="absolute"` + `top`/`left`. An un-sized, non-absolute scroll defaults to
 * `flexGrow: 1` so bare `<Scroll>`s share the parent's space.
 *
 * `visible`/`enabled`/`background` are accepted (part of `ControlProps`) but are NOT applied
 * to the viewport — the protocol carries only per-scroll geometry.
 *
 * Content NOT wrapped in any `<Scroll>` falls into the root scroll, so simple UIs need none.
 *
 * ```tsx
 * render(
 *   <Panel flexDirection="row" gap={4}>
 *     <Scroll width="30%">{left}</Scroll>
 *     <Scroll>{right}</Scroll>
 *   </Panel>,
 *   player,
 * );
 * ```
 */
export interface ScrollProps extends ControlProps {
  children?: JSX.Node;
}

export const Scroll: FunctionComponent<ScrollProps> = ({ children, ...rest }: ScrollProps): JSX.Element => ({
  type: SCROLL_SLOT_TYPE,
  props: {
    // Viewport laid out like any other control: control props flow through withControl into
    // __layout. `__axis` is fixed to 'y' so the title still carries the axis field (protocol
    // unchanged); horizontal scrolling isn't exposed yet.
    ...withControl(rest),
    __axis: 'y' satisfies ScrollAxis,
    children,
  },
});

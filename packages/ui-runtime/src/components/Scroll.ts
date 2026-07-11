import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, withControl } from './control';

/** The element type emitted by `<Scroll>`. Transparent: registered without a writer. */
export const SCROLL_SLOT_TYPE = 'scroll-slot';

/** Scroll axis. Only `'y'` is exposed publicly; `'x'` exists for the protocol field. */
export type ScrollAxis = 'x' | 'y';

/**
 * TITLE-FORMAT constant: how many custom scroll blocks the title reserves space for.
 * Do NOT change — the fixed background offset (BACKGROUND_TITLE_SKIP) and the modal
 * flow-button blocks are laid out against this padding on both backends.
 */
export const MAX_SCROLLS = 4;

/**
 * RUNTIME limit: how many custom `<Scroll>`s a render may actually use. The RP mounts
 * a fixed pool of pooled scroll controls (indices 1..MAX_POOLED_SCROLLS) on top of the
 * implicit root scroll (index 0), and every mounted slot re-instantiates the FULL
 * form_buttons collection — the dominant engine-side cost on big screens — so the pool
 * is kept as small as real layouts need. A render with more `<Scroll>`s throws in the
 * layout phase (the extras would otherwise silently not render).
 *
 * To grow the pool: raise this constant AND re-add the RP side — a `scroll_N` slot in
 * scroll_pool.json (block_skip 83 + 498·N) plus `label_router_rN` / `button_router_rN` /
 * `header_router_rN` variants. The title format already carries up to {@link MAX_SCROLLS}.
 */
export const MAX_POOLED_SCROLLS = 2;

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
 * A render may contain at most {@link MAX_SCROLLS} `<Scroll>`s.
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

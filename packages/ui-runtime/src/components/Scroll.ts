import { FunctionComponent, JSX } from '../jsx';
import type { FlexSize } from './layout';

/**
 * `<Scroll>` — one scroll region. Each `<Scroll>` in a render becomes an independent
 * scroll viewport (index 0 is the root); its children scroll along `axis`. A `<Scroll>`
 * is a leaf box in its parent's flex flow, so arrange a group with the parent's
 * `flexDirection` (e.g. a row `<Panel>` for side-by-side columns); setting both `x` and
 * `y` positions the viewport absolutely.
 *
 * Content NOT wrapped in any `<Scroll>` falls into a single full-screen root scroll, so
 * simple UIs need no `<Scroll>` at all.
 *
 * ```tsx
 * render(
 *   <Panel flexDirection="row" gap={4}>
 *     <Scroll>{left}</Scroll>
 *     <Scroll>{right}</Scroll>
 *   </Panel>,
 *   player,
 * );
 * ```
 */
export interface ScrollProps {
  /** Scroll direction: `'y'` vertical (default) or `'x'` horizontal. */
  axis?: 'x' | 'y';
  /** Viewport width override (px or `"50%"`); otherwise sized by the outer flow. */
  width?: FlexSize;
  /** Viewport height override (px or `"40%"`); otherwise sized by the outer flow. */
  height?: FlexSize;
  /** Absolute viewport left (px). Set with `y` to position the viewport freely. */
  x?: number;
  /** Absolute viewport top (px). Set with `x` to position the viewport freely. */
  y?: number;
  children?: JSX.Node;
}

export const Scroll: FunctionComponent<ScrollProps> = (
  { axis = 'y', width, height, x, y, children }: ScrollProps,
): JSX.Element => ({
  type: 'scroll-slot',
  props: { __axis: axis, __width: width, __height: height, __x: x, __y: y, children },
});

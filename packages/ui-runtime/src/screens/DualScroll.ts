import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { useSetScreen } from '../hooks';
import type { FunctionComponent, JSX } from '../jsx';

/**
 * Column widths (px) for the dual-scroll screen — an asymmetric 34% / 66% split of the
 * canonical content width. The two columns sum to the full canonical width and are centered.
 * These MUST match the scroll_view viewport widths baked into `dual_scroll_screen.json`
 * (the content width is title-driven from these values; the viewport widths are baked).
 */
export const DUAL_SCROLL_TOTAL_WIDTH = CANONICAL_SCREEN.width;
export const DUAL_SCROLL_LEFT_WIDTH = Math.round(DUAL_SCROLL_TOTAL_WIDTH * 0.34);
export const DUAL_SCROLL_RIGHT_WIDTH = DUAL_SCROLL_TOTAL_WIDTH - DUAL_SCROLL_LEFT_WIDTH;

export interface DualScrollProps {
  /** Must be the two slot elements: `<DualScroll.Left>` and `<DualScroll.Right>`. */
  children?: JSX.Node;
}

export interface DualScrollSlotProps {
  children?: JSX.Node;
}

/**
 * Region slot for the left (region 0) column of a dual scroll screen.
 * Transparent: emits no payload; the layout pass lays its subtree out in its own
 * coordinate space and tags every descendant with region 0.
 */
const Left: FunctionComponent<DualScrollSlotProps> = ({ children }: DualScrollSlotProps): JSX.Element => ({
  type: 'region-slot',
  props: { __region: 0, __regionWidth: DUAL_SCROLL_LEFT_WIDTH, children },
});

/** Region slot for the right (region 1) column of a dual scroll screen. */
const Right: FunctionComponent<DualScrollSlotProps> = ({ children }: DualScrollSlotProps): JSX.Element => ({
  type: 'region-slot',
  props: { __region: 1, __regionWidth: DUAL_SCROLL_RIGHT_WIDTH, children },
});

/**
 * `DualScroll` — a screen component declaring the two-region `dual_scroll` layout.
 *
 * It selects the screen layout itself (via {@link useSetScreen}) and requires its content
 * to be wrapped in the typed slot components, one per scroll column:
 *
 * ```tsx
 * render(
 *   <DualScroll>
 *     <DualScroll.Left>{leftColumn}</DualScroll.Left>
 *     <DualScroll.Right>{rightColumn}</DualScroll.Right>
 *   </DualScroll>,
 *   player,
 * );
 * ```
 *
 * Each slot is an independent layout root, so the two columns scroll independently. The
 * slots must sit directly under `DualScroll` (no concrete element in between) so the
 * region-aware layout pass can reach them.
 */
const DualScrollRoot: FunctionComponent<DualScrollProps> = ({ children }: DualScrollProps): JSX.Element => {
  useSetScreen({ type: 'dual_scroll' });

  return { type: 'fragment', props: { children } };
};

export const DualScroll = Object.assign(DualScrollRoot, { Left, Right });

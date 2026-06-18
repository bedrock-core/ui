import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { useSetScreen } from '../hooks';
import type { FunctionComponent, JSX } from '../jsx';

/**
 * Flexbox width (px) of each dual-scroll column — half the canonical content width.
 * Both columns plus the inter-column gap make up the single-scroll footprint, so the
 * dual layout occupies the same centered width as a normal scroll screen. The RP
 * `dual_scroll_screen.json` region geometry must match this value.
 */
export const DUAL_SCROLL_REGION_WIDTH = Math.floor(CANONICAL_SCREEN.width / 2);

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
  props: { __region: 0, __regionWidth: DUAL_SCROLL_REGION_WIDTH, children },
});

/** Region slot for the right (region 1) column of a dual scroll screen. */
const Right: FunctionComponent<DualScrollSlotProps> = ({ children }: DualScrollSlotProps): JSX.Element => ({
  type: 'region-slot',
  props: { __region: 1, __regionWidth: DUAL_SCROLL_REGION_WIDTH, children },
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

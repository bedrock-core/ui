import { entry, placed, topLeft } from '../utils/place';
import type { Box, Control, ControlEntry, Face } from '../utils/types';

/** The bar the layout reserves beside every scrolling region, along its whole edge. */
export const TRACK_WIDTH = 5;

/** Which way a region scrolls. */
export type Axis = 'vertical' | 'horizontal';

export interface ScrollFace extends Box {
  /**
   * The scrolling shape this mounts, qualified.
   *
   * A region is a hundred lines of render-pack JSON — a clipping viewport, a
   * track, a draggable box, and two switches that were measured rather than
   * guessed — and it is identical on every screen and every host. It also
   * names its own parts by sibling name, which only resolves inside the
   * definition that declares them. So it is mounted by reference, never
   * inlined, and one shape exists per axis.
   */
  shape: string;
  /**
   * The definition holding what scrolls, qualified. A region takes its content
   * BY NAME rather than holding it, so the content is a definition of its own
   * and this face only points at it.
   */
  content: string;
}

/**
 * A viewport over content larger than itself.
 *
 * The same on every screen, which is why it reads nothing and binds nothing:
 * a region clips and scrolls content the build already baked. The client does
 * the scrolling; the layout stays frozen.
 */
export const scrollFace: Face<ScrollFace> = data => entry(`${data.name}@${data.shape}`, {
  ...placed(data),
  $scrolling_content: data.content,
});

export interface ContentFace {
  axis: Axis;
  /**
   * The viewport ACROSS the scrolling axis, less the track: the content's
   * width when it scrolls down, its height when it scrolls sideways.
   */
  across: number;
  /** How far the content runs ALONG the scrolling axis. Never less than the viewport. */
  extent: number;
  children: readonly ControlEntry[];
}

/**
 * What scrolls, as its own definition.
 *
 * Never smaller than the viewport along the scrolling axis: with asserts on,
 * content that fits with room to spare puts the scrollbar's percentage outside
 * 0 to 1 and the client asserts.
 */
export const scrollContent = (data: ContentFace): Control => ({
  type: 'panel',
  size: data.axis === 'vertical' ? [data.across, data.extent] : [data.extent, data.across],
  ...topLeft,
  controls: [...data.children],
});

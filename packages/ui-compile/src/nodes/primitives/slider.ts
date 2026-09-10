import { MODAL_SLIDER_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import type { JSX } from '@bedrock-core/ui-runtime';
import { sliderFace } from '../../faces';
import type { ControlEntry } from '../../jsonui';
import { type FieldBase, scaleOf, sliderMount } from '../utils/fields';
import { boxOf, num } from '../utils/shared';
import type { NodeDefinition } from '../utils/types';

/**
 * A track and a thumb the engine drags: the value baked as a step index.
 *
 * The engine works in whole steps, so the author's range becomes a count and
 * their default becomes an index into it. The face draws the thumb where that
 * index puts it, which is where the engine draws it on the first frame.
 */
export interface SliderNode extends FieldBase {
  kind: 'slider';
  /** The track, progress and thumb textures, as the mounted slider reads them. */
  mount: Record<string, string>;
  /** The bar's own texture; absent leaves the face's blank canvas. */
  track?: string;
  /** The grip's texture; absent leaves the face's blank canvas. */
  thumb?: string;
  /**
   * Geometry the author gave, for the boxes that would otherwise decode it.
   *
   * Absent means the engine's own, which both readers supply: the render pack
   * defaults every one of these boxes to `1 x 0`, so a number is not optional
   * once the payload is gone — only the CHOICE of number is.
   */
  trackHeight?: number;
  thumbWidth?: number;
  thumbHeight?: number;
  /** The discrete step count, baked from min, max and step. */
  steps: number;
  /** The default as a step index over that count. */
  value: number;
}

declare module '../utils/types' {
  interface IrNodeMap {
    slider: SliderNode;
  }
}

/** The engine's discrete step count, from the author's range. */
const stepsOf = (element: JSX.Element): number => {
  const args = element.nativeArgs;
  const min = num(args?.['min'], 0);
  const max = num(args?.['max'], 1);
  const step = num(args?.['step'], 0);

  return Math.max(1, Math.round(step > 0 ? (max - min) / step : max - min));
};

/** The default value as a step index over that count. */
const valueOf = (element: JSX.Element): number => {
  const args = element.nativeArgs;
  const min = num(args?.['min'], 0);
  const max = num(args?.['max'], 1);
  const step = num(args?.['step'], 0);
  const unit = step > 0 ? step : 1;
  const start = Math.min(Math.max(num(args?.['defaultValue'], min), min), max);

  return Math.max(0, Math.min(stepsOf(element), Math.round((start - min) / unit)));
};

export const sliderDefinition: NodeDefinition<SliderNode> = {
  kind: 'slider',
  types: [MODAL_SLIDER_SLOT_TYPE],

  lower(element, _type, ctx): SliderNode {
    const { props } = element;
    const mount = sliderMount(props);
    const track = mount['$track'];
    const thumb = mount['$thumb'];

    return {
      kind: 'slider',
      name: ctx.name('field'),
      rect: ctx.rect,
      ...ctx.decoration,
      address: ctx.cellOf(element).address,
      mount,
      scale: scaleOf(element.props),
      ...track === undefined ? {} : { track },
      ...thumb === undefined ? {} : { thumb },
      ...typeof props.trackHeight === 'number' ? { trackHeight: props.trackHeight } : {},
      ...typeof props.thumbWidth === 'number' ? { thumbWidth: props.thumbWidth } : {},
      ...typeof props.thumbHeight === 'number' ? { thumbHeight: props.thumbHeight } : {},
      steps: stepsOf(element),
      value: valueOf(element),
    };
  },

  socket: () => 'field',

  face(node): ControlEntry {
    return sliderFace({
      ...boxOf(node),
      ...node.track === undefined ? {} : { track: node.track },
      ...node.thumb === undefined ? {} : { thumb: node.thumb },
      ...node.trackHeight === undefined ? {} : { trackHeight: node.trackHeight },
      ...node.thumbWidth === undefined ? {} : { thumbWidth: node.thumbWidth },
      ...node.thumbHeight === undefined ? {} : { thumbHeight: node.thumbHeight },
      steps: node.steps,
      value: node.value,
    });
  },
};

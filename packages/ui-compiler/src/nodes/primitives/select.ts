import {
  fallbackGroupDefaults, isGroupDefaults, MODAL_INLINE_SELECT_SLOT_TYPE,
  optionElements, optionLabelPosition, readOption,
} from '@bedrock-core/ui-runtime/compile';
import type { JSX } from '@bedrock-core/ui-runtime';
import { type OptionFace, optionParts, type OptionState, selectFace } from '../../faces';
import type { ControlEntry } from '../../jsonui';
import type { Rect } from '../../ir';
import { backgroundOf, type FieldBase, scaleOf } from '../utils/fields';
import { boxOf, str } from '../utils/shared';
import type { LowerContext, NodeDefinition } from '../utils/types';

/**
 * Every option at once, the chosen one marked: a chooser that opens nothing.
 *
 * The engine's dropdown still owns the answer — an inline select is its
 * options placed by the compile instead of by the popup — so this is a native
 * field like the rest, drawn rather than opened.
 */
export interface SelectNode extends FieldBase {
  kind: 'select';
  /** The surface behind the options; absent leaves the face's blank canvas. */
  background?: string;
  /** The options, placed, and which one is marked at rest. */
  options: InlineOption[];
  selected: number;
}

/**
 * One option as the build laid it out: its row inside the field, and the look
 * of each state.
 *
 * An inline select's rows cannot position themselves the way a native row does
 * — a size or an offset read through a binding is inert under a compiled
 * mount — so the compile places each at its rect and draws its faces from the
 * author's textures rather than decoding them.
 */
export interface InlineOption {
  /** The row, relative to the field's own rect. */
  rect: Rect;
  label: string;
  /** Where the label sits in the row: the build's alignment, from the row's top-left. */
  labelX: number;
  labelY: number;
  fontType: string;
  fontScaleFactor: number;
  /** Row faces per state; `''` draws nothing. */
  background: string;
  backgroundHover: string;
  backgroundSelected: string;
  /** Bullet glyphs per state, at the row's left middle; `''` draws nothing. */
  bullet: string;
  bulletSelected: string;
  bulletHover: string;
  bulletSelectedHover: string;
  bulletWidth: number;
  bulletHeight: number;
}

/** The state of an option a face is drawn for. */
export type InlineOptionState = OptionState;

declare module '../utils/types' {
  interface IrNodeMap {
    select: SelectNode;
  }
}

/** A radio bullet's left inset, then the gap to the label; the writer's own numbers. */
const LABEL_GAP = 4;

/**
 * The options as the layout placed them, read the way the runtime's writer
 * reads them, so the rows the compile draws are the rows the engine's
 * selection is numbered by.
 */
const optionsOf = (element: JSX.Element, ctx: LowerContext): InlineOption[] => {
  const defaults = isGroupDefaults(element.nativeArgs?.['groupDefaults'])
    ? element.nativeArgs['groupDefaults']
    : fallbackGroupDefaults();

  return optionElements(element.props.children).map((option) => {
    const data = readOption(option, defaults, ctx.own.x, ctx.own.y);
    const { style, geometry } = data;
    const label = optionLabelPosition(
      data.text, style, geometry.width, geometry.height, style.bulletTexture === '' ? LABEL_GAP : style.bulletWidth + LABEL_GAP,
    );

    return {
      rect: { x: geometry.x, y: geometry.y, width: geometry.width, height: geometry.height },
      label: data.text,
      labelX: label.x,
      labelY: label.y,
      fontType: style.fontType,
      fontScaleFactor: style.fontScaleFactor,
      background: style.background,
      backgroundHover: style.backgroundHover,
      backgroundSelected: style.backgroundSelected,
      bullet: style.bulletTexture,
      bulletSelected: style.bulletSelectedTexture,
      bulletHover: style.bulletHoverTexture,
      bulletSelectedHover: style.bulletSelectedHoverTexture,
      bulletWidth: style.bulletWidth,
      bulletHeight: style.bulletHeight,
    };
  });
};

/** Which option is marked at rest: the default value's, else the first. */
const selectedOf = (element: JSX.Element): number => {
  const value = str(element.nativeArgs?.['defaultValue']);
  const index = optionElements(element.props.children).findIndex(option => str(option.props.value) === value);

  return Math.max(0, index);
};

/** One placed option, as the face layer takes it. */
const faceOf = (option: InlineOption, name: string): OptionFace => ({
  name,
  rect: option.rect,
  background: option.background,
  backgroundHover: option.backgroundHover,
  backgroundSelected: option.backgroundSelected,
  bullet: option.bullet,
  bulletHover: option.bulletHover,
  bulletSelected: option.bulletSelected,
  bulletSelectedHover: option.bulletSelectedHover,
  bulletWidth: option.bulletWidth,
  bulletHeight: option.bulletHeight,
  label: option.label,
  labelX: option.labelX,
  labelY: option.labelY,
  style: { fontType: option.fontType, fontScaleFactor: option.fontScaleFactor },
});

/**
 * One option's look in one state: its row face, its bullet and its label.
 *
 * The face document draws the rest state and the selected one; the modal host
 * puts all four inside the toggle it stands in.
 */
export const inlineOptionFace = (option: InlineOption, state: InlineOptionState): ControlEntry[] =>
  optionParts({ ...faceOf(option, ''), state });

export const selectDefinition: NodeDefinition<SelectNode> = {
  kind: 'select',
  types: [MODAL_INLINE_SELECT_SLOT_TYPE],

  lower(element, _type, ctx): SelectNode {
    return {
      kind: 'select',
      name: ctx.name('field'),
      rect: ctx.rect,
      ...ctx.decoration,
      address: ctx.cellOf(element).address,
      scale: scaleOf(element.props),
      ...backgroundOf(element.props),
      options: optionsOf(element, ctx),
      selected: selectedOf(element),
    };
  },

  socket: () => 'field',

  face(node): ControlEntry {
    return selectFace({
      ...boxOf(node),
      ...node.background === undefined ? {} : { background: node.background },
      selected: node.selected,
      options: node.options.map((option, index) => faceOf(option, `option_${String(index)}`)),
    });
  },
};

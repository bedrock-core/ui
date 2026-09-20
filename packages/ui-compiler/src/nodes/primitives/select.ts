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
 * Every option at once, the chosen ones marked: a chooser that opens nothing.
 *
 * The engine still owns the answer, so this is a native field like the rest,
 * drawn rather than opened. One choice is the engine's dropdown with its
 * options placed by the compile instead of by the popup; several are a native
 * toggle per option, each placed at its option's rect.
 */
export interface SelectNode extends FieldBase {
  kind: 'select';
  /** The surface behind the options; absent leaves the face's blank canvas. */
  background?: string;
  /** Whether any number may be chosen: a native toggle per option rather than one chooser. */
  multiple: boolean;
  /** The options, placed, and which ones are marked at rest. */
  options: InlineOption[];
  selected: number[];
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
  /** The label's colour, and its colour while selected; absent leaves the label's own. */
  color?: readonly [number, number, number];
  colorSelected?: readonly [number, number, number];
  /** How far the label sits lower while selected, in px. */
  dropSelected?: number;
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
      ...style.color === undefined ? {} : { color: style.color },
      ...style.colorSelected === undefined ? {} : { colorSelected: style.colorSelected },
      ...style.dropSelected === undefined ? {} : { dropSelected: style.dropSelected },
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

/** Whether the select takes any number of choices. */
const isMultiple = (element: JSX.Element): boolean => element.nativeArgs?.['multiple'] === true;

/**
 * Which options are marked at rest. One choice marks the default value's, else
 * the first; several mark every default value's, which may be none.
 */
const selectedOf = (element: JSX.Element): number[] => {
  const values = optionElements(element.props.children).map(option => str(option.props.value));
  const defaults = element.nativeArgs?.['defaultValue'];

  if (isMultiple(element)) {
    const on = new Set(Array.isArray(defaults) ? defaults.map(value => str(value)) : []);

    return values.flatMap((value, index) => (on.has(value) ? [index] : []));
  }

  return [Math.max(0, values.indexOf(str(defaults)))];
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
  style: {
    fontType: option.fontType,
    fontScaleFactor: option.fontScaleFactor,
    ...option.color === undefined ? {} : { color: option.color },
  },
  ...option.colorSelected === undefined ? {} : { colorSelected: option.colorSelected },
  ...option.dropSelected === undefined ? {} : { dropSelected: option.dropSelected },
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
      enabled: element.props.enabled !== false,
      scale: scaleOf(element.props),
      ...backgroundOf(element.props),
      multiple: isMultiple(element),
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

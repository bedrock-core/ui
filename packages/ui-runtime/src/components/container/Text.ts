import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';
import { CHARSET, MAX_CODE } from '../../container/charset';

/** Width of one character cell, in texels. */
const DEFAULT_CELL_WIDTH = 6;

export interface TextProps extends ControlProps {
  /** The string to draw. Write it inline, the way you would anywhere else. */
  children?: string;
  /**
   * How many characters to make room for.
   *
   * This is the one thing a compiled screen cannot work out for itself: a
   * string costs one container slot per character, and the build has to reserve
   * them before it knows what the string will say. It defaults to the length of
   * whatever the first render produced, so a label of fixed width needs nothing
   * — set it when the text can grow.
   */
  maxLength?: number;
  /** Texels per character. Cells are packed, so this is only the reserved box. */
  cellWidth?: number;
  shadow?: boolean;
}

/**
 * A line of live text.
 *
 * A container slot publishes no free-form text — `#hover_text` turned out to be
 * a single hover-driven screen value that any press steals, and
 * `#group_item_group_name` is empty for a container. Numbers do get through, so
 * a string arrives one character at a time: each cell reads its slot's stack
 * size, the layout builds `bcui.c.<code>`, and a `localize: true` label
 * resolves it against a generated `.lang`. What each code draws is whatever the
 * table says — any glyph, any font, any language.
 *
 * Writing a character is `ContainerSlot.amount = code`: one native call with
 * nothing allocated, and unchanged cells are skipped.
 *
 * The alphabet is {@link MAX_CODE} glyphs, because a stack stops at 64. For
 * text that never changes, use the library's own `Text`, which is baked into
 * the layout and may contain any character at all.
 */
export const Text: FunctionComponent<TextProps> = ({
  children = '',
  maxLength,
  cellWidth = DEFAULT_CELL_WIDTH,
  shadow,
  ...rest
}: TextProps): JSX.Element => {
  const length = Math.max(1, maxLength ?? children.length);

  return {
    // Its own element type rather than the library's `text`: the layout pass
    // measures a text node and pins the result as an explicit width, which
    // would size this one against whatever the first render happened to say.
    type: 'container_text',
    props: {
      ...withControl({ flexShrink: 0, width: length * cellWidth, height: 10, ...rest }),
      text: children,
      maxLength: length,
      cellWidth,
      ...shadow === undefined ? {} : { shadow },
    },
  };
};

export { CHARSET, MAX_CODE };

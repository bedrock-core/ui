import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';
import { MAX_CODE } from '../../container/charset';

/** Width of one character cell, in texels. */
const DEFAULT_CELL_WIDTH = 6;

export interface DynamicTextProps extends ControlProps {
  /** Addresses the string from the script side. Unique within a screen. */
  name: string;
  /**
   * How many characters the screen makes room for.
   *
   * This is the cost: one container slot per character. A longer run is not
   * slower to update — only changed cells are written — but it does make the
   * host entity bigger.
   */
  maxLength: number;
  /** Texels per character. Cells are fixed width, so the run reads monospace. */
  cellWidth?: number;
  shadow?: boolean;
}

/**
 * A line of text the script writes as an ordinary string.
 *
 * No per-slot binding publishes text — `#hover_text` turned out to be a single
 * hover-driven screen value that any press steals, and `#group_item_group_name`
 * is empty for a container. Numbers do get through, so a string arrives one
 * character at a time: each cell reads its slot's stack size, the layout builds
 * `bcui.c.<code>`, and a `localize: true` label resolves it against a generated
 * `.lang`. What each code draws as is therefore whatever the table says — any
 * glyph, any font, any language.
 *
 * Writes are cheap: a character is `ContainerSlot.amount = code`, one native
 * call with nothing allocated, and unchanged cells are skipped.
 *
 * The alphabet is {@link MAX_CODE} glyphs, because a stack stops at 64.
 */
export const DynamicText: FunctionComponent<DynamicTextProps> = ({
  name,
  maxLength,
  cellWidth = DEFAULT_CELL_WIDTH,
  shadow,
  ...rest
}: DynamicTextProps): JSX.Element => ({
  // Its own element type rather than 'text': the layout pass measures a text
  // node and pins the result as an explicit width, which would size this one
  // against a string that does not exist yet.
  type: 'container_text',
  props: {
    // Width comes from the run, not from flex: the cells are laid out by hand
    // at a known pitch, so the box has to be exactly as wide as they are. It
    // does not shrink — a label shorter than the font clips to nothing.
    ...withControl({
      flexShrink: 0,
      width: maxLength * cellWidth,
      height: 10,
      ...rest,
    }),
    name,
    maxLength,
    cellWidth,
    ...shadow === undefined ? {} : { shadow },
  },
});

export { MAX_CODE };

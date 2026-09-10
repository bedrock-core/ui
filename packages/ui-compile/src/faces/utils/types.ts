import type { Control, ControlEntry } from '../../jsonui';

export type { Control, ControlEntry };

/** A box on the screen, solved by the layout, in texels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * What every face is given: a name to be found by, and the box the layout
 * solved for it.
 *
 * `layer` matters more here than in a form, because a compiled screen shares
 * the chest screen with vanilla's own controls and those carry layers of their
 * own. `hidden` is present only when the author hid the control, since JSON UI
 * shows by default.
 */
export interface Box {
  /** Unique within the document. Becomes the control name in the output. */
  name: string;
  rect: Rect;
  layer?: number;
  hidden?: boolean;
}

/**
 * One look, drawn.
 *
 * A face is a pure function: the data it is given in, one JSON UI control out.
 * It reads nothing, binds nothing and knows no host — what a control physically
 * IS on the screen serving it is decided elsewhere, and stood in the face's
 * place afterwards. That is what lets the same look serve every screen.
 *
 * Children arrive already drawn, so a face never recurses and never reaches
 * for a walk. A face that needs a shared definition is given its qualified
 * name, never the means to make one.
 */
export type Face<D extends Box> = (data: D) => ControlEntry;

/** How glyphs are drawn: the fields a label carries beyond its string. */
export interface TextStyle {
  /**
   * Engine font alias, e.g. `default` or `MinecraftTen`. Absent leaves the
   * font to whatever the label is drawn inside, which is what the captions
   * within a native field want.
   */
  fontType?: string;
  /**
   * Scale over the `small` base. Every label is drawn at `font_size: small`
   * and scaled from there, so a compiled label matches what the form render
   * pack paints and the measured layout agrees with the engine.
   */
  fontScaleFactor: number;
  shadow?: boolean;
  /** Glyph colour, RGB in 0..1. */
  color?: readonly [number, number, number];
  /** Where the glyphs sit in a box wider than the text. Absent: the engine's left. */
  align?: 'left' | 'center' | 'right';
}

/** A control's four looks. A state left empty keeps the resting one. */
export interface States {
  texture: string;
  hover?: string;
  pressed?: string;
  disabled?: string;
}

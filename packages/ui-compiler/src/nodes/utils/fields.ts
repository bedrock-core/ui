import { labelFontFields, UNSTYLED_TEXTURE } from '@bedrock-core/ui-runtime/compile';
import type { JSX } from '@bedrock-core/ui-runtime';
import { num, str } from './shared';
import type { NodeBase } from './types';

/**
 * What the five native fields share.
 *
 * A native field is the one kind of control a compiled screen does not draw.
 * A `ModalFormData` row is instantiated by VANILLA's `collection_panel`
 * factory, and the interactive widget inside it — the thing that reads and
 * writes the player's answer — is the engine's; no definition replaces it. So
 * the compiled screen PLACES the widget and tells it which row it is, and what
 * it draws in the face document is that widget's look at rest.
 *
 * Which is why each of the five is a primitive of its own: a switch, a track,
 * a box of text, a closed dropdown and a column of options have nothing in
 * common visually. What they share is here — the row they answer on, and the
 * scale of the labels inside them.
 */
export interface FieldBase extends NodeBase {
  /** Row in `custom_form`, and the `formValues` slot the answer arrives in. */
  address: number;
  /** `font_scale_factor` for the labels inside the widget, over the `small` base. */
  scale: number;
}

/**
 * What a label inside one of these widgets is scaled by.
 *
 * Every label in the render pack is declared `font_size: small`, which draws at
 * HALF the engine's standard glyph and is scaled back up from there — so the
 * factor a 1.0 scale means is 2, not 1.
 *
 * The number is the one the COMPONENT already worked out. A field's own `scale`
 * prop is consumed where the element is built — `FormInput` folds it into the
 * value and placeholder label groups, `FormDropdown` into the current-value
 * group — so it never reaches these props at all, and re-deriving it from a
 * `scale` that is always undefined would ignore whatever the author (or the
 * style package) asked for.
 */
export const scaleOf = (props: JSX.Props): number => num(
  props.valueFontScale ?? props.currentFontScale,
  labelFontFields().fontScaleFactor,
);

/** The first texture the author actually gave, of a state and what it varies from. */
const first = (...textures: readonly string[]): string => textures.find(texture => texture !== '') ?? '';

/** Only the variables the author gave a texture for; the rest are never set. */
const given = (variables: Record<string, string>): Record<string, string> => Object.fromEntries(
  Object.entries(variables).filter((entry): entry is [string, string] => entry[1] !== ''),
);

/**
 * The textures the author gave, as the variables the mounted widget reads.
 *
 * The library ships no look: every texture on a compiled screen comes from the
 * props the author wrote, exactly as a `Button`'s face does. A style package is
 * just an author with opinions.
 *
 * A state the author left out takes the one it varies FROM — a hover from its
 * own resting side, a locked look from the same. The render pack cannot do that
 * itself: each of its `|default`s is a literal, so an unset `$on_hover` draws
 * the blank canvas rather than the toggle's own background, and an unset
 * `$thumb_hover` resolves `#texture` against a payload a compiled screen never
 * sends. A state that falls back to nothing at all is simply not set.
 *
 * Each kind is given only the variables ITS widget reads: `$off` and `$on` exist
 * on the toggle alone, the track and thumb on the slider alone, and everything
 * else draws through `core_ui_common.state_face` from `$static_texture`.
 */
export const toggleMount = (props: JSX.Props): Record<string, string> => {
  const off = str(props.background);
  const on = first(str(props.checkedBackground), off);

  return given({
    $off: off,
    $on: on,
    $off_hover: first(str(props.backgroundHover), off),
    $on_hover: first(str(props.checkedHover), on),
    $off_locked: first(str(props.backgroundLocked), off),
    $on_locked: first(str(props.checkedLocked), on),
  });
};

/**
 * The one surface most kinds draw, through `core_ui_common.state_face`.
 *
 * Always given, never omitted: the face draws exactly what it is handed, and a
 * field whose author styled nothing gets the blank canvas the runtime uses for
 * an unstyled surface — the same texture, said out loud.
 */
export const surfaceMount = (props: JSX.Props): Record<string, string> =>
  ({ $static_texture: first(str(props.background), UNSTYLED_TEXTURE) });

/** The slider's own images: its track, the fill behind the thumb, and the thumb. */
export const sliderMount = (props: JSX.Props): Record<string, string> => {
  const track = str(props.background);
  const progress = str(props.progress);
  const thumb = str(props.thumb);

  return {
    ...surfaceMount(props),
    ...given({
      $track: track,
      $track_hover: first(str(props.backgroundHover), track),
      $progress: progress,
      $progress_hover: first(str(props.progressHover), progress),
      $thumb: thumb,
      $thumb_hover: first(str(props.thumbHover), thumb),
      $thumb_locked: first(str(props.thumbLocked), thumb),
    }),
  };
};

/** A dropdown draws its own surface and the popup's. */
export const dropdownMount = (props: JSX.Props): Record<string, string> => ({
  ...surfaceMount(props),
  // Everything else the popup draws — each row's face, each row's label — rides
  // that option's blob, which travels on both paths.
  ...given({ $popup_texture: str(props.popupBackground) }),
});

/** The texture a field's face draws at rest, or nothing when the author gave none. */
export const backgroundOf = (props: JSX.Props): { background?: string } => {
  const texture = str(props.background);

  return texture === '' ? {} : { background: texture };
};

import type { DropdownNode } from '../../nodes/primitives/dropdown';
import type { InputNode } from '../../nodes/primitives/input';
import type { SliderNode } from '../../nodes/primitives/slider';
import type { ToggleNode } from '../../nodes/primitives/toggle';
import type { Control } from '../../jsonui';

/**
 * What the engine's own widget is handed when the modal stands it in a field's
 * place.
 *
 * This is the modal half of a native field, and it exists only here: an
 * `<Input>` is a primitive with a face on any screen, and what makes it a
 * MODAL field is the row definition below plus the variables it reads. A host
 * without one of these refuses the kind by name.
 */

/** The definition each kind mounts: the library's own wrapper, with nothing to decode. */
const TOGGLE_ROW = 'core_ui_form_components.toggle';
const SLIDER_ROW = 'core_ui_form_components.slider';
const DROPDOWN_ROW = 'core_ui_form_components.dropdown';
const INPUT_ROW = 'core_ui_form_components.input';

/**
 * The engine's own defaults for the boxes a compiled slider is told rather
 * than lets decode. The thumb matches the static 16 by 16 `slider_box` hitbox.
 */
const TRACK_HEIGHT = 10;
const THUMB_WIDTH = 16;
const THUMB_HEIGHT = 16;

/**
 * Every box a slider sizes from the payload, given literally instead.
 *
 * FOUR of them, not one: the travel area the thumb moves in, the track behind
 * it, the track's hover copy, and the thumb itself. Each is a `1 x 0` panel
 * that measures itself from the decode, so with no payload each is `0 x 0` and
 * everything beneath it disappears.
 *
 * Arrays, never a pair of numbers in strings: a size must carry a unit or be a
 * real number, and `"$w"` holding `304` is neither.
 */
const sliderBoxes = (node: SliderNode): Record<string, unknown> => {
  const track = node.trackHeight ?? TRACK_HEIGHT;
  const thumb = node.thumbWidth ?? THUMB_WIDTH;

  return {
    // Baked, never read from the row: a compiled slider exists behind its
    // title gate on screens with no row at all, and an unresolved steps read
    // is a division by zero inside the engine's percentage. The starting value
    // is baked too — the engine seeds the row from the form data and owns the
    // drag — so the control needs no collection reads at all.
    $steps: node.steps,
    $value: node.value,
    // The engine bounds the thumb's CENTRE to the control's width, so the box
    // the slider lives in is narrower than the track by one thumb — then the
    // thumb's EDGE meets the track ends at min and max. The same expression
    // the layout phase writes into `travelWidth` for an interpreted slider.
    $travel_size: [Math.max(0, node.rect.width - thumb), node.rect.height],
    $bar_size: [node.rect.width, track],
    $thumb_size: [thumb, node.thumbHeight ?? THUMB_HEIGHT],
  };
};

/** The control a compiled screen hosts its dropdown popups in, named after the screen. */
export const popupHostOf = (ns: string): string => `${ns}_popups`;

/** The row a toggle mounts, and what it reads. */
export const toggleWidget = (node: ToggleNode): { definition: string; props: Control } => ({
  definition: TOGGLE_ROW,
  // The toggle mounts its own payload-free twin rather than the interpreter's
  // wrapper, so there is no decode to replace.
  props: { size: ['100%', '100%'], ...node.mount },
});

/** The row a slider mounts, with every box it would otherwise decode. */
export const sliderWidget = (node: SliderNode): { definition: string; props: Control } => ({
  definition: SLIDER_ROW,
  props: { $scale: node.scale, ...sliderBoxes(node), ...node.mount },
});

/** The row an input mounts, with the engine pointed at the static labels. */
export const inputWidget = (node: InputNode): { definition: string; props: Control } => ({
  definition: INPUT_ROW,
  props: { $scale: node.scale, ...node.mount },
});

/** The row a dropdown mounts, told where the screen hosts its popup. */
export const dropdownWidget = (node: DropdownNode, ns: string): { definition: string; props: Control } => ({
  definition: DROPDOWN_ROW,
  // The engine hosts the popup box in the control this names, found BY NAME
  // across the screen: the screen's own popup host, so the name resolves
  // wherever the screen is mounted.
  props: { $scale: node.scale, $dropdown_area: popupHostOf(ns), ...node.mount },
});

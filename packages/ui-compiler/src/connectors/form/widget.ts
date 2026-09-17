import type { DropdownNode } from '../../nodes/primitives/dropdown';
import type { InputNode } from '../../nodes/primitives/input';
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
export const TOGGLE_ROW = 'core_ui_form_components.toggle';
const DROPDOWN_ROW = 'core_ui_form_components.dropdown';
const INPUT_ROW = 'core_ui_form_components.input';

/** The control a compiled screen hosts its dropdown popups in, named after the screen. */
export const popupHostOf = (ns: string): string => `${ns}_popups`;

/** The row a toggle mounts, and what it reads. */
export const toggleWidget = (node: ToggleNode): { definition: string; props: Control } => ({
  definition: TOGGLE_ROW,
  // The toggle mounts a payload-free twin of the shared one, so there is no
  // decode to replace.
  props: { size: ['100%', '100%'], ...node.mount },
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

/**
 * Primitives that only mean something inside a compiled container screen.
 *
 * They are ordinary components — flex children, composable, usable inside your
 * own components — that expand at build time into JSON UI. Only three of them
 * are primitive at all:
 *
 *  - `Slot`, a real container cell, with a role saying what the player may do
 *    with it. `Button` is a slot whose item the runtime owns.
 *  - `Fill`, an image clipped by a number. `Progress` is two of those.
 *  - `DynamicText`, a string the script writes, one container slot per glyph.
 *
 * Everything else — panels, static labels, images — is the library's own, the
 * same components a server form uses. A compiled screen is not a separate
 * dialect; it is the same tree taken down a different path.
 */

export { CHEST_CANVAS, SLOT_SIZE } from './constants';
export { Container, type ContainerProps } from './Container';
export { DynamicText, type DynamicTextProps, MAX_CODE } from './DynamicText';
export { Fill, type FillDirection, type FillProps } from './Fill';
export { Progress, type ProgressProps } from './Progress';
export { Slot, type SlotProps, type SlotRole } from './Slot';
export { Button, type ButtonProps } from './Button';
export { SlotGrid, type SlotGridProps } from './SlotGrid';
export { Background, Hotbar, PlayerInventory, Vanilla, type VanillaProps } from './Vanilla';

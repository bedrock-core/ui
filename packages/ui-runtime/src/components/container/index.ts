/**
 * Primitives that only mean something inside a compiled container screen.
 *
 * They are ordinary components — flex children, composable, usable inside your
 * own components — and everything about them is declared inline, the way it is
 * anywhere else in this library. There is no registry to keep in step with the
 * layout: a handler is a prop, a value is a prop, and the runtime matches them
 * to the compiled screen by POSITION, which is safe because the shape is frozen.
 *
 * Only three are primitive at all:
 *
 *  - `Slot`, a real container cell, with a role saying what the player may do
 *    with it. `Button` is a slot that draws a button instead of an item.
 *  - `Fill`, an image clipped by a number. `Progress` is two of those.
 *  - `Text`, a live string, one container slot per glyph.
 *
 * Everything else — panels, static labels, images — is the library's own, the
 * same components a server form uses.
 */

export { CHEST_CANVAS, SLOT_SIZE } from './constants';
export { Container, type ContainerProps } from './Container';
export { Text, type TextProps, MAX_CODE } from './Text';
export { Fill, type FillDirection, type FillProps } from './Fill';
export { Progress, type ProgressProps } from './Progress';
export { Slot, type SlotProps, type SlotRole } from './Slot';
export { Button, type ButtonProps } from './Button';
export { SlotGrid, type SlotGridProps } from './SlotGrid';
export { Background, Hotbar, PlayerInventory, Vanilla, type VanillaProps } from './Vanilla';

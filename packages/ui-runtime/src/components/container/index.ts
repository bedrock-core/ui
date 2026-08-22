/**
 * Primitives that only mean something inside a compiled container screen.
 *
 * They are ordinary components — flex children, composable, usable inside your
 * own components — that expand at build time into JSON UI. What separates them
 * from the rest of the library is that each one implies an allocation: a slot
 * index, or a bank channel. The author never sees either.
 */

export { CHEST_CANVAS, SLOT_SIZE } from './constants';
export { Container, type ContainerProps } from './Container';
export { Progress, type FillDirection, type ProgressProps } from './Progress';
export { Slot, type SlotProps } from './Slot';
export { SlotGrid, type SlotGridProps } from './SlotGrid';

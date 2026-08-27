import type { Entity, ItemStack, Player } from '@minecraft/server';
import type { PressEvent, SlotEvent } from '../../../../core/events';
import type { CellRole, SlotEntry } from '../../allocate';
import type { ItemContainer } from '../items';
import type { PollHost } from '../poll';

/**
 * What one kind of drawn cell does with its container slot.
 *
 * A cell's role is fixed by the allocation — a button, or a slot of some role
 * — and the runtime only ever does two things with it: makes the slot AGREE
 * with the element (at open, and again after every render for a button), and
 * decides what a CHANGE in the slot meant. Each role answers both in its own
 * module; the poll and the reconcile own the sweep and dispatch here.
 */
export interface CellBehavior {
  readonly role: CellRole;
  /**
   * Makes the slot agree with its element. Runs for every drawn cell at open,
   * and for buttons after every render. Writes only what the runtime owns.
   */
  settle?(container: ItemContainer, entry: SlotEntry): void;
  /** The slot changed since the last poll, from `before` to `after`. */
  changed(host: PollHost, entry: SlotEntry, before: ItemStack | undefined, after: ItemStack | undefined): void;
}

export type PressHandler = (event: PressEvent) => void;
export type InsertHandler = (event: SlotEvent) => void;
export type RemoveHandler = (event: SlotEvent) => void;

export { isHandler } from '../../../../core/events';

/**
 * What a handler may be called with. A player who left, an entity that died
 * or a stack the engine already emptied would throw the moment the handler
 * touched them, so every argument is checked for its type id and validity
 * first, and a handler that cannot be called safely is skipped.
 */
export const validPlayer = (value: Player | undefined): value is Player =>
  value !== undefined && value.isValid && value.typeId === 'minecraft:player';

export const validStack = (value: ItemStack | undefined): value is ItemStack =>
  value !== undefined
  && typeof value.typeId === 'string' && value.typeId !== ''
  && Number.isInteger(value.amount) && value.amount >= 1;

export const validHost = (value: Entity | undefined): value is Entity =>
  value !== undefined && value.isValid && typeof value.typeId === 'string' && value.typeId !== '';

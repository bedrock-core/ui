/**
 * The drawn-cell roles, keyed by the role the allocation assigns.
 *
 * A slot's role decides what the runtime does with its container slot — how it
 * is settled against the element, and what a change in it means. Each role is
 * one module; the poll and the reconcile dispatch here and own nothing else.
 */

import type { CellRole } from '../../allocate';
import { buttonCell } from './button';
import { inputCell } from './input';
import { outputCell } from './output';
import { storageCell } from './storage';
import type { CellBehavior } from './types';

export type { CellBehavior } from './types';
export { isEnabled } from './button';

const CELLS: readonly CellBehavior[] = [buttonCell, storageCell, inputCell, outputCell];

const byRole = new Map<CellRole, CellBehavior>(CELLS.map(cell => [cell.role, cell]));

/** The behavior of a cell role. Every role the allocation can assign has one by construction. */
export const cellFor = (role: CellRole): CellBehavior => {
  const cell = byRole.get(role);

  if (cell === undefined) {
    throw new Error(`No cell behavior handles the "${role}" role.`);
  }

  return cell;
};

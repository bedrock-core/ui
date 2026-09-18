import type { FunctionComponent, JSX } from '../jsx';
import type { ControlProps } from './control';
import { SlotGrid } from './SlotGrid';

/**
 * The player's own inventory, the 9 × 3 grid every container screen shows
 * under its content. A {@link SlotGrid} over the player's `inventory_items`.
 */
export const PlayerInventory: FunctionComponent<ControlProps> = (props: ControlProps): JSX.Element =>
  SlotGrid({ collection: 'inventory_items', columns: 9, rows: 3, ...props });

/** The player's hotbar, the 9 × 1 grid over `hotbar_items`. The same redrawn cell as {@link PlayerInventory}. */
export const Hotbar: FunctionComponent<ControlProps> = (props: ControlProps): JSX.Element =>
  SlotGrid({ collection: 'hotbar_items', columns: 9, rows: 1, ...props });

import { createContext } from '../core/fabric/context';
import type { ItemAuxMap } from './ItemAuxMap';

/**
 * Context that provides the item aux map (typeId → aux value) to the component tree.
 *
 * Seeded automatically at the render root with calibrated data from the `item-aux`
 * Regolith filter — no provider needed. `ItemRenderer` just works out of the box.
 *
 * To override for a subtree (e.g. custom item data), wrap with this context:
 *
 * ```tsx
 * <ItemAuxContext value={myCustomAuxMap}>
 *   <MyInventory />
 * </ItemAuxContext>
 * ```
 *
 * If the `item-aux` generated package is missing, `ItemRenderer` will throw an
 * `ItemAuxError` at render time.
 */
export const ItemAuxContext = createContext<ItemAuxMap | null>(null);

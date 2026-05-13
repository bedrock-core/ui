import { createContext } from '../core/fabric/context';
import type { ItemAuxMap } from './ItemAuxMap';

/**
 * Context that provides the item aux map (typeId → aux value) to the component tree.
 *
 * At the root of your UI, import the generated JSON and wrap with this context:
 *
 * ```tsx
 * import itemAuxMap from './data/itemAuxMap.generated.json';
 *
 * render(
 *   <ItemAuxContext value={itemAuxMap}>
 *     <MyInventory />
 *   </ItemAuxContext>,
 *   player,
 * );
 * ```
 *
 * `ItemRenderer` reads from this context automatically. Without a provider,
 * `ItemRenderer` will throw an `ItemAuxError` at render time instructing you
 * to install the `item-aux` Regolith filter.
 */
export const ItemAuxContext = createContext<ItemAuxMap | null>(null);

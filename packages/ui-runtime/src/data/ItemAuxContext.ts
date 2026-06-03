import { createContext } from '../core/fabric/context';
import type { ItemAuxMap } from './ItemAuxMap';

/**
 * Context that provides the item aux map (typeId → aux value) to the component tree.
 *
 * At the root of your UI, use `ItemAuxProvider` which handles calibration automatically:
 *
 * ```tsx
 * import itemAuxData from './data/item-aux/itemAuxMap.generated.json';
 *
 * render(
 *   <ItemAuxProvider data={itemAuxData}>
 *     <MyInventory />
 *   </ItemAuxProvider>,
 *   player,
 * );
 * ```
 *
 * `ItemRenderer` reads from this context automatically. Without a provider,
 * `ItemRenderer` will throw an `ItemAuxError` at render time instructing you
 * to install the `item-aux` Regolith filter.
 */
export const ItemAuxContext = createContext<ItemAuxMap | null>(null);

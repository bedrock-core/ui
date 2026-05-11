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
 * `ItemRenderer` reads from this context automatically — no need to pass the map
 * as a prop. Without a provider the default is an empty map and all aux values
 * will fall back to `0`.
 */
export const ItemAuxContext = createContext<ItemAuxMap>({});

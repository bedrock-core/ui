import { createContext } from '../core/fabric/context';

/**
 * Context that marks the current component tree as being inside an InventoryScreen.
 * ItemRenderer reads this to guard against rendering outside the inventory layout.
 */
export const InventoryScreenContext = createContext<boolean>(false);

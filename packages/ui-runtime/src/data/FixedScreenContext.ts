import { createContext } from '../core/fabric/context';

/**
 * Context that marks the current component tree as being inside a FixedScreen.
 * ItemRenderer reads this (alongside InventoryScreenContext) to permit item
 * rendering in the non-scrolling fixed layout.
 */
export const FixedScreenContext = createContext<boolean>(false);

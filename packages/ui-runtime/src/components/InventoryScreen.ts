import { FunctionComponent, JSX } from '../jsx';
import { InventoryScreenContext } from '../data/InventoryScreenContext';
import { useScreenType } from '../hooks/useScreenType';

export interface InventoryScreenProps {
  children: JSX.Node;
}

/**
 * Root wrapper for inventory-style screens. Activates the two-panel RP layout
 * (tab bar + item grid on the left, player inventory on the right) and permits
 * ItemRenderer components inside this tree.
 *
 * Always use via createTabNavigator — do not nest multiple InventoryScreens.
 */
export const InventoryScreen: FunctionComponent<InventoryScreenProps> = ({
  children,
}: InventoryScreenProps): JSX.Element => {
  useScreenType('inventory');

  return {
    type: 'context-provider',
    props: {
      __context: InventoryScreenContext,
      value: true,
      children,
    },
  };
};

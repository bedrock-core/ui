import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, withControl } from './control';

export interface InventoryProps extends ControlProps {
}

export const Inventory: FunctionComponent<InventoryProps> = ({ ...rest }: InventoryProps): JSX.Element => ({
  type: 'inventory',
  props: {
    ...withControl(rest),
  },
});

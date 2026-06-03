import { ItemStack } from '@minecraft/server';
import { ItemAuxError } from '../core/types';
import { ItemAuxContext } from '../data/ItemAux';
import { useContext, useScreen } from '../hooks';
import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, withControl } from './control';

export interface ItemRendererProps extends ControlProps {
  item: ItemStack;
}

export const ItemRenderer: FunctionComponent<ItemRendererProps> = ({
  item,
  ...rest
}: ItemRendererProps): JSX.Element => {
  const auxMap = useContext(ItemAuxContext);
  const screen = useScreen();

  if (auxMap === null) {
    throw new ItemAuxError(
      `ItemAuxContext is not provided. Did you forget to install the 'item-aux' Regolith filter `
      + `and wrap your UI in <ItemAuxContext value={itemAuxMap}>?`,
    );
  }

  if (!screen.allowsItems) {
    throw new ItemAuxError(
      `ItemRenderer can only be used on an item-capable screen, but the current screen is '${screen.type}'. `
      + 'Render the screen with Screen.Fixed.',
    );
  }

  const controlProps = withControl({ width: 16, height: 16, ...rest });

  return {
    type: 'item_renderer',
    props: {
      ...controlProps,
      aux: auxMap[item.typeId] ?? 0,
    },
  };
};

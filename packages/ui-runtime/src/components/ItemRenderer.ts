import { ItemComponentTypes, ItemStack } from '@minecraft/server';
import { ItemAuxError } from '../core/types';
import { ItemAuxContext } from '../data/ItemAux';
import { useContext } from '../hooks';
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

  if (auxMap === null) {
    throw new ItemAuxError(
      `ItemAuxContext is not provided. Did you forget to install the 'item-aux' Regolith filter `
      + `and wrap your UI in <ItemAuxContext value={itemAuxMap}>?`,
    );
  }

  const controlProps = withControl({ width: 16, height: 16, ...rest });

  const enchantable = item.getComponent(ItemComponentTypes.Enchantable);
  const isEnchanted = enchantable !== undefined && enchantable.getEnchantments().length > 0;

  return {
    type: 'item_renderer',
    props: {
      ...controlProps,
      aux: (auxMap[item.typeId] ?? 0) + (isEnchanted ? 32768 : 0),
    },
  };
};

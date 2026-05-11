import { ItemLockMode, ItemStack } from '@minecraft/server';
import { useContext } from '../hooks';
import { FunctionComponent, JSX } from '../jsx';
import { ItemAuxContext } from '../data/ItemAuxContext';
import { ControlProps, withControl } from './control';

export interface ItemRendererProps extends ControlProps {
  /** ItemStack to render in this slot. Omit or pass `undefined` for an empty slot. */
  item?: ItemStack;
}

export const ItemRenderer: FunctionComponent<ItemRendererProps> = ({
  item,
  ...rest
}: ItemRendererProps): JSX.Element => {
  const auxMap = useContext(ItemAuxContext);

  return {
    type: 'item_slot',
    props: {
      ...withControl(rest),
      aux: item ? (auxMap[item.typeId] ?? 0) : 0,
      amount: item?.amount ?? 0,
      nameTag: item?.nameTag ?? '',
      keepOnDeath: item?.keepOnDeath ?? false,
      lockMode: (item?.lockMode ?? ItemLockMode.none).toString(),
      lore: item?.getLore().join('\n') ?? '',
    },
  };
};

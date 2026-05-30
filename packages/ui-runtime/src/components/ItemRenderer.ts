import { ItemLockMode, ItemStack } from '@minecraft/server';
import { useContext } from '../hooks';
import { FunctionComponent, JSX } from '../jsx';
import { ItemAuxContext } from '../data/ItemAuxContext';
import { InventoryScreenContext } from '../data/InventoryScreenContext';
import { FixedScreenContext } from '../data/FixedScreenContext';
import { ItemAuxError } from '../core/types';
import { ControlProps, withControl } from './control';

export interface ItemRendererProps extends ControlProps {
  /** ItemStack to render in this slot. Omit or pass `undefined` for an empty slot. */
  item?: ItemStack;
  /** When true, renders a hover tooltip showing item name and lore alongside the slot. */
  tooltip?: boolean;
}

export const ItemRenderer: FunctionComponent<ItemRendererProps> = ({
  item,
  tooltip = true,
  ...rest
}: ItemRendererProps): JSX.Element => {
  const auxMap = useContext(ItemAuxContext);
  const allowed = useContext(InventoryScreenContext) || useContext(FixedScreenContext);

  if (auxMap === null) {
    throw new ItemAuxError(
      `ItemAuxContext is not provided. Did you forget to install the 'item-aux' Regolith filter `
      + `and wrap your UI in <ItemAuxContext value={itemAuxMap}>?`,
    );
  }

  if (!allowed) {
    throw new ItemAuxError(
      'ItemRenderer can only be used inside an item-capable screen. '
      + 'Wrap your UI in <InventoryScreen> (or use createTabNavigator) or <FixedScreen>.',
    );
  }

  const controlProps = withControl({ width: 16, height: 16, ...rest });

  return {
    type: 'item_renderer',
    props: {
      ...controlProps,
      aux: item ? (auxMap[item.typeId] ?? 0) : 0,
      nameTag: item?.nameTag ?? item?.localizationKey ?? '',
      amount: item?.amount ?? 0,
      keepOnDeath: item?.keepOnDeath ?? false,
      lockMode: (item?.lockMode ?? ItemLockMode.none).toString(),
      lore: item?.getLore().join('\n') ?? '',
      tooltip: !!tooltip,
    },
  };
};

import { ItemLockMode, ItemStack } from '@minecraft/server';
import { useContext, useScreen } from '../hooks';
import { FunctionComponent, JSX } from '../jsx';
import { ItemAuxContext } from '../data/ItemAuxContext';
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
      + 'Render the screen with Screen.Inventory or Screen.Fixed.',
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

import { ItemComponentTypes, ItemStack } from '@minecraft/server';
import { ItemAuxError } from '../core/types';
import { ItemAuxContext } from '../data/ItemAux';
import { useContext } from '../hooks';
import { FunctionComponent, JSX } from '../jsx';
import { ControlProps, withControl } from './control';

/** @experimental */
export interface ItemRendererProps extends ControlProps {
  item: ItemStack;
}

/**
 * Renders an item icon using the aux ID map supplied via `ItemAuxContext`.
 *
 * **Requires a manual `ItemAuxContext` wrapping the component tree.**
 * Throws `ItemAuxError` at render time if no provider is present.
 *
 * @experimental
 */
export const ItemRenderer: FunctionComponent<ItemRendererProps> = ({
  item,
  ...rest
}: ItemRendererProps): JSX.Element => {
  const auxMap = useContext(ItemAuxContext);

  if (auxMap === null) {
    throw new ItemAuxError(
      `ItemAuxContext is not provided. Wrap your component tree with `
      + `<ItemAuxContext value={myMap}> and supply your own ItemAuxMap.`,
    );
  }

  const controlProps = withControl({ width: 16, height: 16, enabled: false, ...rest });

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

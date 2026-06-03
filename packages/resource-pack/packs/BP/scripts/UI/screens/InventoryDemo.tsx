import { Button, EquipmentSlots, ItemContainer, ItemSlot, theme } from '@bedrock-core/ore-styled';
import { ItemAuxProvider, Panel, Screen, Text, useExit, usePlayer, useSetScreen, type JSX } from '@bedrock-core/ui';

function InventoryDemoContent(): JSX.Element {
  const player = usePlayer();
  const exit = useExit();
  const { spacing } = theme.tokens;
  const eq = theme.components.itemSlot.textures.equipment;

  const container = player.getComponent('inventory')?.container;
  const equippable = player.getComponent('equippable');

  return (
    <Panel
      flexDirection={'column'}
      gap={spacing.md}
      padding={spacing.md}
      background={'textures/ui/recipe_book_group_expanded'}
    >
      <Panel flexDirection={'row'} justifyContent={'space-between'} alignItems={'center'}>
        <Text>{'§b§lInventory Slots Demo'}</Text>
        <Button variant={'secondary'} onPress={exit}>{'§7Close'}</Button>
      </Panel>

      <Text>{'§eSingle slots'}</Text>
      <Panel flexDirection={'row'} gap={spacing.sm}>
        <ItemSlot />
        <ItemSlot overlay={eq.helmet} />
        <ItemSlot overlay={eq.shield} />
        {container && <ItemSlot slot={container.getSlot(0)} />}
      </Panel>

      <Text>{'§eEquipment + Inventory'}</Text>
      <Panel flexDirection={'row'} gap={spacing.md} alignItems={'flex-start'}>
        {equippable && <EquipmentSlots equippable={equippable} />}
        {container && (
          <Panel flexDirection={'column'} gap={0}>
            <ItemContainer container={container} start={9} count={27} columns={9} />
            <ItemContainer container={container} start={0} count={9} columns={9} />
          </Panel>
        )}
      </Panel>
    </Panel>
  );
}

export function InventoryDemo(): JSX.Element {
  useSetScreen(Screen.Fixed);

  return (
    <ItemAuxProvider>
      <InventoryDemoContent />
    </ItemAuxProvider>
  );
}

import { FunctionComponent, ItemRenderer, JSX, Panel, Text } from '@bedrock-core/ui';
import { ItemStack } from '@minecraft/server';
import { MinecraftItemTypes } from '@minecraft/vanilla-data';

export const InventoryPanel: FunctionComponent = (): JSX.Element => (
  <Panel flexDirection={'column'} justifyContent={'center'} padding={6} gap={4}>
    <Text alignSelf={'flex-start'}>{'§cInventory'}</Text>
    <ItemRenderer width={16} height={16} item={new ItemStack(MinecraftItemTypes.Stone, 1)} tooltip />
    <ItemRenderer width={16} height={16} item={new ItemStack(MinecraftItemTypes.VerdantFroglight, 1)} tooltip />
    <ItemRenderer
      width={16}
      height={16}
      item={new ItemStack(MinecraftItemTypes.IronSword, 1)}
      tooltip
    />
  </Panel>
);

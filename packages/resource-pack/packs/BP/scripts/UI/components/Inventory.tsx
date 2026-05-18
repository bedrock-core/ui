import { FunctionComponent, ItemRenderer, JSX, Panel, Text } from '@bedrock-core/ui';
import { ItemStack } from '@minecraft/server';
import { MinecraftItemTypes } from '@minecraft/vanilla-data';

export const InventoryPanel: FunctionComponent = (): JSX.Element => (
  <Panel flexDirection={'column'} justifyContent={'center'} padding={6} gap={4}>
    <Text alignSelf={'flex-start'}>{'§cInventory'}</Text>
    <ItemRenderer item={new ItemStack(MinecraftItemTypes.Stone, 1)} />
    <ItemRenderer item={new ItemStack(MinecraftItemTypes.NetheriteAxe, 1)} />
    <ItemRenderer item={new ItemStack(MinecraftItemTypes.PinkStainedGlassPane, 1)} />
  </Panel>
);

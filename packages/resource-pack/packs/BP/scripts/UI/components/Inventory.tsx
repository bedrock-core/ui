import { FunctionComponent, ItemRenderer, JSX, Panel, Text } from '@bedrock-core/ui';
import { ItemStack } from '@minecraft/server';

export const InventoryPanel: FunctionComponent = (): JSX.Element => (
  <Panel flexDirection={'column'} justifyContent={'center'} padding={6} gap={4}>
    <Text alignSelf={'flex-start'}>{'§cInventory'}</Text>
    <ItemRenderer width={16} height={16} item={new ItemStack('stone', 1)} />
  </Panel>
);

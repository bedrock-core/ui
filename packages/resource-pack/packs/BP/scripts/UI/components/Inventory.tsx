import { FunctionComponent, Inventory, JSX, Panel, Text } from '@bedrock-core/ui';

export const InventoryPanel: FunctionComponent = (): JSX.Element => (
  <Panel flexDirection={'column'} padding={6} gap={4}>
    {/* Title */}
    <Text>{'§cInventory'}</Text>

    <Inventory />
  </Panel>
);

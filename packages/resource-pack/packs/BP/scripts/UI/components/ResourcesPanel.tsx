import { JSX, Panel, Text, Image, FunctionComponent } from '@bedrock-core/ui';

/**
 * ResourcesPanel - Displays decorative images
 * Grid Position: Row 3, Column 2
 */
export const ResourcesPanel: FunctionComponent = (): JSX.Element => (
  <Panel flexDirection={'column'} padding={6} gap={4}>
    <Text>{'§6Resources'}</Text>
    <Panel flexDirection={'row'} gap={6}>
      <Image width={32} height={32} texture={'textures/items/emerald'} />
      <Image width={32} height={32} texture={'textures/items/diamond'} />
      <Image width={32} height={32} texture={'textures/items/gold_ingot'} />
      <Image width={32} height={32} texture={'textures/items/redstone_dust'} />
    </Panel>
    <Text>{'§7Decorative images'}</Text>
    <Text>{'§7in the UI demo'}</Text>
  </Panel>
);

import { JSX, Panel, Text, Image, FunctionComponent } from '@bedrock-core/ui';

/**
 * ResourcesPanel - Displays decorative images
 * Grid Position: Row 3, Column 2
 */
export const ResourcesPanel: FunctionComponent = (): JSX.Element => (
  <Panel width={192} height={140} x={212} y={310}>
    <Text width={192} height={20} x={10} y={10}>§l§6Resources</Text>
    <Image width={48} height={48} x={10} y={35} texture={'textures/items/emerald'} />
    <Image width={48} height={48} x={63} y={35} texture={'textures/items/diamond'} />
    <Image width={48} height={48} x={10} y={88} texture={'textures/items/gold_ingot'} />
    <Image width={48} height={48} x={63} y={88} texture={'textures/items/redstone_dust'} />
    <Text width={192} height={12} x={118} y={50}>§7Decorative</Text>
    <Text width={192} height={12} x={118} y={65}>§7images in</Text>
    <Text width={192} height={12} x={118} y={80}>§7UI demo</Text>
  </Panel>
);


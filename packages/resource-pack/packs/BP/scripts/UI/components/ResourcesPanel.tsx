import { JSX, Panel, Text, Image, FunctionComponent } from '@bedrock-core/ui';

/**
 * ResourcesPanel - Displays decorative images
 * Grid Position: Row 3, Column 2
 */
export const ResourcesPanel: FunctionComponent = (): JSX.Element => (
  <Panel width={192} height={140} x={212} y={310}>
    <Text width={192} height={20} x={10} y={10} value={'§l§6Resources'} />
    <Image width={48} height={48} x={10} y={35} texture={'textures/items/emerald'} />
    <Image width={48} height={48} x={63} y={35} texture={'textures/items/diamond'} />
    <Image width={48} height={48} x={10} y={88} texture={'textures/items/gold_ingot'} />
    <Image width={48} height={48} x={63} y={88} texture={'textures/items/redstone_dust'} />
    <Text width={192} height={12} x={118} y={50} value={'§7Decorative'} />
    <Text width={192} height={12} x={118} y={65} value={'§7images in'} />
    <Text width={192} height={12} x={118} y={80} value={'§7UI demo'} />
  </Panel>
);


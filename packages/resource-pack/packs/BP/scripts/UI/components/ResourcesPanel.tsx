import { JSX, Panel, Text, Image, FunctionComponent } from '@bedrock-core/ui';

/**
 * ResourcesPanel - Displays decorative images
 * Grid Position: Row 3, Column 2 (3-row, 4-column grid)
 * Using relative positioning: 0-100 percentages
 */
export const ResourcesPanel: FunctionComponent = (): JSX.Element => (
  <Panel width={24} height={31} x={26} y={67}>
    <Text width={100} height={14} x={5} y={7}>{'§l§6Resources'}</Text>
    <Image width={25} height={34} x={5} y={25} texture={'textures/items/emerald'} />
    <Image width={25} height={34} x={33} y={25} texture={'textures/items/diamond'} />
    <Image width={25} height={34} x={5} y={63} texture={'textures/items/gold_ingot'} />
    <Image width={25} height={34} x={33} y={63} texture={'textures/items/redstone_dust'} />
    <Text width={100} height={9} x={61} y={36}>{'§7Decorative'}</Text>
    <Text width={100} height={9} x={61} y={46}>{'§7images in'}</Text>
    <Text width={100} height={9} x={61} y={57}>{'§7UI demo'}</Text>
  </Panel>
);

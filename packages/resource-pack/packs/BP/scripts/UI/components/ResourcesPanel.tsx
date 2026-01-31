import { JSX, Panel, Text, Image, FunctionComponent } from '@bedrock-core/ui';

/**
 * ResourcesPanel - Displays decorative images
 * Grid Position: Row 3, Column 2 (3-row, 4-column grid)
 * Using relative positioning: 0-1 values represent percentages
 */
export const ResourcesPanel: FunctionComponent = (): JSX.Element => (
  <Panel width={25} height={25} x={0} y={0}>
    <Text width={100} height={14} x={5} y={7}>{'§l§6Resources'}</Text>
    <Image width={25} height={34} x={5} y={25} texture={'textures/items/emerald'} />
    <Image width={25} height={34} x={32} y={25} texture={'textures/items/diamond'} />
    <Image width={25} height={34} x={5} y={62} texture={'textures/items/gold_ingot'} />
    <Image width={25} height={34} x={32} y={62} texture={'textures/items/redstone_dust'} />
    <Text width={100} height={8} x={61} y={35}>{'§7Decorative'}</Text>
    <Text width={100} height={8} x={61} y={46}>{'§7images in'}</Text>
    <Text width={100} height={8} x={61} y={57}>{'§7UI demo'}</Text>
  </Panel>
);
// export const ResourcesPanel: FunctionComponent = (): JSX.Element => (
//   <Panel width={0.25} height={0.333} x={0.25} y={0.667}>
//     <Text width={1.0} height={0.143} x={0.052} y={0.071}>{'§l§6Resources'}</Text>
//     <Image width={0.25} height={0.343} x={0.052} y={0.25} texture={'textures/items/emerald'} />
//     <Image width={0.25} height={0.343} x={0.328} y={0.25} texture={'textures/items/diamond'} />
//     <Image width={0.25} height={0.343} x={0.052} y={0.629} texture={'textures/items/gold_ingot'} />
//     <Image width={0.25} height={0.343} x={0.328} y={0.629} texture={'textures/items/redstone_dust'} />
//     <Text width={1.0} height={0.086} x={0.615} y={0.357}>{'§7Decorative'}</Text>
//     <Text width={1.0} height={0.086} x={0.615} y={0.464}>{'§7images in'}</Text>
//     <Text width={1.0} height={0.086} x={0.615} y={0.571}>{'§7UI demo'}</Text>
//   </Panel>
// );

import { JSX, Panel, Text, Image, FunctionComponent } from '@bedrock-core/ui';

/**
 * ResourcesPanel - Displays decorative images
 * Grid Position: Row 3, Column 2
 */
export const ResourcesPanel: FunctionComponent = (): JSX.Element => (
  <Panel width={220} height={140} x={240} y={310}>
    <Text width={220} height={20} x={250} y={320} value={'§l§6Resources'} />
    <Image width={48} height={48} x={255} y={345} texture={'textures/items/emerald'} />
    <Image width={48} height={48} x={310} y={345} texture={'textures/items/diamond'} />
    <Image width={48} height={48} x={255} y={398} texture={'textures/items/gold_ingot'} />
    <Image width={48} height={48} x={310} y={398} texture={'textures/items/redstone_dust'} />
    <Text width={220} height={12} x={370} y={360} value={'§7Decorative'} />
    <Text width={220} height={12} x={370} y={375} value={'§7images in'} />
    <Text width={220} height={12} x={370} y={390} value={'§7UI demo'} />
  </Panel>
);


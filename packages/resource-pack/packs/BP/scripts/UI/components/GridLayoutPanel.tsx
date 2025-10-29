import { JSX, Panel, Text, FunctionComponent } from '@bedrock-core/ui';

/**
 * GridLayoutPanel - Displays information about the grid layout
 * Grid Position: Row 3, Column 3
 */
export const GridLayoutPanel: FunctionComponent = (): JSX.Element => (
  <Panel width={192} height={140} x={414} y={310}>
    <Text width={192} height={20} x={424} y={320} value={'§l§3Grid Layout'} />
    <Text width={192} height={15} x={424} y={345} value={'§e3 rows × 4 columns'} />
    <Text width={192} height={15} x={424} y={365} value={'§aUniform sizing'} />
    <Text width={192} height={15} x={424} y={385} value={'§b192×140 cells'} />
    <Text width={192} height={15} x={424} y={405} value={'§d10px gaps'} />
    <Text width={192} height={12} x={424} y={430} value={'§7Clean & organized'} />
  </Panel>
);

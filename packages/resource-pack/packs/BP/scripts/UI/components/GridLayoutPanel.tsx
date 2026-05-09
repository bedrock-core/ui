import { JSX, Panel, Text, FunctionComponent } from '@bedrock-core/ui';

/**
 * GridLayoutPanel - Displays information about the grid layout
 * Grid Position: Row 3, Column 3
 */
export const GridLayoutPanel: FunctionComponent = (): JSX.Element => (
  <Panel flexDirection={'column'} padding={6} gap={4}>
    <Text>{'§3Grid Layout'}</Text>
    <Text>{'§e3 rows x 4 columns'}</Text>
    <Text>{'§aUniform sizing'}</Text>
    <Text>{'§bFlex-based cards'}</Text>
    <Text>{'§dWrapped layout'}</Text>
    <Text>{'§7Clean & organized'}</Text>
  </Panel>
);

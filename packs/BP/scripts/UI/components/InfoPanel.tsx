import { JSX, Panel, Text, FunctionComponent } from '@bedrock-core/ui';

/**
 * InfoPanel - Displays information about all hooks demonstrated
 * Grid Position: Row 3, Column 1
 */
export const InfoPanel: FunctionComponent = (): JSX.Element => (
  <Panel width={220} height={140} x={10} y={310}>
    <Text width={220} height={20} x={20} y={320} value={'§l§6All Hooks Demo'} />
    <Text width={220} height={15} x={20} y={345} value={'§l§auseState'} />
    <Text width={220} height={15} x={20} y={362} value={'§l§buseEffect'} />
    <Text width={220} height={15} x={20} y={379} value={'§l§duseRef'} />
    <Text width={220} height={15} x={20} y={396} value={'§l§euseContext'} />
    <Text width={220} height={15} x={20} y={413} value={'§l§buseReducer'} />
    <Text width={220} height={12} x={20} y={433} value={'§7Check console!'} />
  </Panel>
);


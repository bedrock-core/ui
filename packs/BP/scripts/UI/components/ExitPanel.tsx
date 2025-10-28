import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { world } from '@minecraft/server';
import { uiManager } from '@minecraft/server-ui';

/**
 * ExitPanel - Button to close the UI
 * Grid Position: Row 3, Column 4
 */
export const ExitPanel: FunctionComponent = (): JSX.Element => (
  <Panel width={192} height={140} x={616} y={310}>
    <Text width={192} height={20} x={626} y={320} value={'§l§cExit Panel'} />
    <Text width={192} height={15} x={626} y={350} value={'§7Close the UI'} />
    <Button
      width={172}
      height={30}
      x={626}
      y={375}
      onPress={(): void => {
        const player = world.getAllPlayers()[0];
        // @ts-expect-error import nested issue
        uiManager.closeAllForms(player);
      }}>
      <Text width={172} height={30} x={631} y={385} value={'§l§cEXIT'} />
    </Button>
    <Text width={192} height={12} x={626} y={420} value={'§7Thanks for testing!'} />
  </Panel>
);


import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { world } from '@minecraft/server';
import { uiManager } from '@minecraft/server-ui';

/**
 * ExitPanel - Button to close the UI
 * Grid Position: Row 3, Column 4
 */
export const ExitPanel: FunctionComponent = (): JSX.Element => (
  <Panel width={220} height={140} x={700} y={310}>
    <Text width={220} height={20} x={710} y={320} value={'§l§cExit Panel'} />
    <Text width={220} height={15} x={710} y={350} value={'§7Close the UI'} />
    <Button
      width={200}
      height={30}
      x={710}
      y={375}
      onPress={(): void => {
        const player = world.getAllPlayers()[0];
        // @ts-expect-error import nested issue
        uiManager.closeAllForms(player);
      }}>
      <Text width={200} height={30} x={810} y={379} value={'§l§cEXIT'} />
    </Button>
    <Text width={220} height={12} x={710} y={420} value={'§7Thanks for testing!'} />
  </Panel>
);


import { JSX, Panel, Text, Button, FunctionComponent, useExit, usePlayer } from '@bedrock-core/ui';

/**
 * ExitPanel - Button to close the UI using useExit hook
 * Grid Position: Row 3, Column 4
 */
export const ExitPanel: FunctionComponent = (): JSX.Element => {
  const exit = useExit();
  const player = usePlayer();

  const handleExit = (): void => {
    player.sendMessage('§7Thanks for testing the UI!');
    exit();
  };

  return (
    <Panel width={192} height={140} x={616} y={310}>
      <Text width={192} height={20} x={10} y={10}>§l§cExit Panel</Text>
      <Text width={192} height={15} x={10} y={40}>§7Close the UI</Text>
      <Button
        width={172}
        height={30}
        x={10}
        y={65}
        onPress={handleExit}>
        <Text width={172} height={30} x={5} y={10}>§l§cEXIT</Text>
      </Button>
      <Text width={192} height={12} x={10} y={110}>§7Thanks for testing!</Text>
    </Panel>
  );
};


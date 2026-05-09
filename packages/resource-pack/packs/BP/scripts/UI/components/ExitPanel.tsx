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
    <Panel flexDirection={'column'} padding={6} gap={4}>
      <Text>{'§cExit Panel'}</Text>
      <Text>{'§7Close the UI'}</Text>
      <Button onPress={handleExit}>
        <Text>{'§cEXIT'}</Text>
      </Button>
      <Text>{'§7Thanks for testing!'}</Text>
    </Panel>
  );
};

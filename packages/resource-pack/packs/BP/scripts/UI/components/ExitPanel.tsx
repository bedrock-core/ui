import { JSX, Panel, Text, FunctionComponent, useExit, usePlayer } from '@bedrock-core/ui';
import { Button } from '@bedrock-core/ore-styled';

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
      <Button variant={'danger'} onPress={handleExit}>{'§cEXIT'}</Button>
      <Text>{'§7Thanks for testing!'}</Text>
    </Panel>
  );
};

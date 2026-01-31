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
    <Panel width={'24%'} height={'31%'} x={'75%'} y={'67%'}>
      <Text width={'100%'} height={'14%'} x={'5%'} y={'7%'}>{'§l§cExit Panel'}</Text>
      <Text width={'100%'} height={'11%'} x={'5%'} y={'29%'}>{'§7Close the UI'}</Text>
      <Button
        width={'90%'}
        height={'21%'}
        x={'5%'}
        y={'46%'}
        onPress={handleExit}
      >
        <Text width={'100%'} height={'100%'} x={'3%'} y={'33%'}>{'§l§cEXIT'}</Text>
      </Button>
      <Text width={'100%'} height={'9%'} x={'5%'} y={'79%'}>{'§7Thanks for testing!'}</Text>
    </Panel>
  );
};

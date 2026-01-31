import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { Settings } from '../contexts';

interface SettingsControllerProps { onSettingsChange: (updater: (prev: Settings) => Settings) => void }

/**
 * SettingsController - Allows user to change settings
 * Grid Position: Row 2, Column 4
 */
export const SettingsController: FunctionComponent<SettingsControllerProps> = ({ onSettingsChange }): JSX.Element => (
  <Panel width={'24%'} height={'31%'} x={'26%'} y={'36%'}>
    <Text width={'100%'} height={'14%'} x={'5%'} y={'7%'}>{'§l§bSettings Control'}</Text>

    <Button
      width={'90%'}
      height={'14%'}
      x={'5%'}
      y={'25%'}
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          volume: Math.min(100, prev.volume + 10),
        }));
      }}
    >
      <Text width={'100%'} height={'100%'} x={'3%'} y={'25%'}>{'§aVolume +'}</Text>
    </Button>

    <Button
      width={'90%'}
      height={'14%'}
      x={'5%'}
      y={'43%'}
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          volume: Math.max(0, prev.volume - 10),
        }));
      }}
    >
      <Text width={'100%'} height={'100%'} x={'3%'} y={'25%'}>{'§cVolume -'}</Text>
    </Button>

    <Button
      width={'90%'}
      height={'14%'}
      x={'5%'}
      y={'61%'}
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          showNotifications: !prev.showNotifications,
        }));
      }}
    >
      <Text width={'100%'} height={'100%'} x={'3%'} y={'25%'}>{'§9Toggle Notify'}</Text>
    </Button>

    <Text width={'100%'} height={'9%'} x={'5%'} y={'82%'}>{'§7State management'}</Text>
  </Panel>
);

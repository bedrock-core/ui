import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { Settings } from '../contexts';

interface SettingsControllerProps { onSettingsChange: (updater: (prev: Settings) => Settings) => void }

/**
 * SettingsController - Allows user to change settings
 * Grid Position: Row 2, Column 4
 */
export const SettingsController: FunctionComponent<SettingsControllerProps> = ({ onSettingsChange }): JSX.Element => (
  <Panel flexDirection={'column'} padding={6} gap={4}>
    <Text>{'§bSettings Control'}</Text>

    <Button
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          volume: Math.min(100, prev.volume + 10),
        }));
      }}
    >
      <Text>{'§aVolume +'}</Text>
    </Button>

    <Button
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          volume: Math.max(0, prev.volume - 10),
        }));
      }}
    >
      <Text>{'§cVolume -'}</Text>
    </Button>

    <Button
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          showNotifications: !prev.showNotifications,
        }));
      }}
    >
      <Text>{'§9Toggle Notify'}</Text>
    </Button>

    <Text>{'§7State management'}</Text>
  </Panel>
);

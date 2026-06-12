import { JSX, Panel, Text, FunctionComponent } from '@bedrock-core/ui';
import { Button } from '@bedrock-core/ore-styled';
import { Settings } from '../contexts';

interface SettingsControllerProps { onSettingsChange: (updater: (prev: Settings) => Settings) => void }

/**
 * SettingsController - Allows user to change settings
 * Grid Position: Row 2, Column 4
 */
export const SettingsController: FunctionComponent<SettingsControllerProps> = ({ onSettingsChange }): JSX.Element => (
  <Panel flexDirection={'column'} padding={6} gap={4}>
    <Text>{'§bSettings Control'}</Text>

    <Button onPress={(): void => {
      onSettingsChange(prev => ({ ...prev, volume: Math.min(100, prev.volume + 10) }));
    }}
    >
      {'§aVolume +'}
    </Button>

    <Button
      variant={'danger'}
      onPress={(): void => {
        onSettingsChange(prev => ({ ...prev, volume: Math.max(0, prev.volume - 10) }));
      }}
    >
      {'§cVolume -'}
    </Button>

    <Button
      variant={'secondary'}
      onPress={(): void => {
        onSettingsChange(prev => ({ ...prev, showNotifications: !prev.showNotifications }));
      }}
    >
      {'§9Toggle Notify'}
    </Button>

    <Text>{'§7State management'}</Text>
  </Panel>
);

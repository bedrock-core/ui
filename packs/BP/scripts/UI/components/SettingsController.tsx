import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { Settings } from '../contexts';

interface SettingsControllerProps { onSettingsChange: (updater: (prev: Settings) => Settings) => void }

/**
 * SettingsController - Allows user to change settings
 * Grid Position: Row 2, Column 4
 */
export const SettingsController: FunctionComponent<SettingsControllerProps> = ({ onSettingsChange }): JSX.Element => (
  <Panel width={192} height={140} x={616} y={160}>
    <Text width={192} height={20} x={626} y={170} value={'§l§bSettings Control'} />

    <Button
      width={172}
      height={20}
      x={626}
      y={195}
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          volume: Math.min(100, prev.volume + 10),
        }));
      }}>
      <Text width={172} height={20} x={631} y={200} value={'§aVolume +'} />
    </Button>

    <Button
      width={172}
      height={20}
      x={626}
      y={220}
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          volume: Math.max(0, prev.volume - 10),
        }));
      }}>
      <Text width={172} height={20} x={631} y={225} value={'§cVolume -'} />
    </Button>

    <Button
      width={172}
      height={20}
      x={626}
      y={245}
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          showNotifications: !prev.showNotifications,
        }));
      }}>
      <Text width={172} height={20} x={631} y={250} value={'§9Toggle Notify'} />
    </Button>

    <Text width={192} height={12} x={626} y={275} value={'§7State management'} />
  </Panel>
);


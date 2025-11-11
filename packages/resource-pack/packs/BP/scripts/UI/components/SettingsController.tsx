import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { Settings } from '../contexts';

interface SettingsControllerProps { onSettingsChange: (updater: (prev: Settings) => Settings) => void }

/**
 * SettingsController - Allows user to change settings
 * Grid Position: Row 2, Column 4
 */
export const SettingsController: FunctionComponent<SettingsControllerProps> = ({ onSettingsChange }): JSX.Element => (
  <Panel width={192} height={140} x={212} y={160}>
    <Text width={192} height={20} x={10} y={10}>§l§bSettings Control</Text>

    <Button
      width={172}
      height={20}
      x={10}
      y={35}
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          volume: Math.min(100, prev.volume + 10),
        }));
      }}>
      <Text width={172} height={20} x={5} y={5}>§aVolume +</Text>
    </Button>

    <Button
      width={172}
      height={20}
      x={10}
      y={60}
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          volume: Math.max(0, prev.volume - 10),
        }));
      }}>
      <Text width={172} height={20} x={5} y={5}>§cVolume -</Text>
    </Button>

    <Button
      width={172}
      height={20}
      x={10}
      y={85}
      onPress={(): void => {
        onSettingsChange(prev => ({
          ...prev,
          showNotifications: !prev.showNotifications,
        }));
      }}>
      <Text width={172} height={20} x={5} y={5}>§9Toggle Notify</Text>
    </Button>

    <Text width={192} height={12} x={10} y={115}>§7State management</Text>
  </Panel>
);


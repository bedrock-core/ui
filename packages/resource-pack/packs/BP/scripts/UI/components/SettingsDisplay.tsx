import { JSX, Panel, Text, FunctionComponent, useContext } from '@bedrock-core/ui';
import { SettingsContext } from '../contexts';

/**
 * SettingsDisplay - Demonstrates reading multiple contexts
 * Grid Position: Row 1, Column 2
 */
export const SettingsDisplay: FunctionComponent = (): JSX.Element => {
  const settings = useContext(SettingsContext);

  return (
    <Panel width={192} height={140} x={212} y={10}>
      <Text width={192} height={20} x={10} y={10}>
        §l§bSettings Display
      </Text>
      <Text width={192} height={15} x={10} y={40}>
        {`Volume: §e${settings.volume}%`}
      </Text>
      <Text width={192} height={15} x={10} y={60}>
        {`Notify: ${settings.showNotifications ? '§aON' : '§cOFF'}`}
      </Text>
      <Text width={192} height={15} x={10} y={90}>
        §7Multiple contexts
      </Text>
      <Text width={192} height={15} x={10} y={110}>
        §7in one component
      </Text>
    </Panel>
  );
};

import { JSX, Panel, Text, FunctionComponent, useContext } from '@bedrock-core/ui';
import { SettingsContext, type Settings } from '../contexts';

/**
 * SettingsDisplay - Demonstrates reading multiple contexts
 * Grid Position: Row 1, Column 2
 */
export const SettingsDisplay: FunctionComponent = (): JSX.Element => {
  const settings = useContext<Settings>(SettingsContext);

  return (
    <Panel flexDirection={'column'} padding={6} gap={4}>
      <Text>{'§bSettings Display'}</Text>
      <Text>{`Volume: §e${settings.volume}%`}</Text>
      <Text>{`Notify: ${settings.showNotifications ? '§aON' : '§cOFF'}`}</Text>
      <Text>{'§7Multiple contexts'}</Text>
      <Text>{'§7in one component'}</Text>
    </Panel>
  );
};

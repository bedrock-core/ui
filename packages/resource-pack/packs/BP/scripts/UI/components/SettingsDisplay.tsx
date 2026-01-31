import { JSX, Panel, Text, FunctionComponent, useContext } from '@bedrock-core/ui';
import { SettingsContext } from '../contexts';

/**
 * SettingsDisplay - Demonstrates reading multiple contexts
 * Grid Position: Row 1, Column 2
 */
export const SettingsDisplay: FunctionComponent = (): JSX.Element => {
  const settings = useContext(SettingsContext);

  return (
    <Panel width={'24%'} height={'31%'} x={'26%'} y={'2%'}>
      <Text width={'100%'} height={'14%'} x={'5%'} y={'7%'}>
        {'§l§bSettings Display'}
      </Text>
      <Text width={'100%'} height={'11%'} x={'5%'} y={'29%'}>
        {`Volume: §e${settings.volume}%`}
      </Text>
      <Text width={'100%'} height={'11%'} x={'5%'} y={'43%'}>
        {`Notify: ${settings.showNotifications ? '§aON' : '§cOFF'}`}
      </Text>
      <Text width={'100%'} height={'11%'} x={'5%'} y={'64%'}>
        {'§7Multiple contexts'}
      </Text>
      <Text width={'100%'} height={'11%'} x={'5%'} y={'79%'}>
        {'§7in one component'}
      </Text>
    </Panel>
  );
};

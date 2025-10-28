import { JSX, Panel, Text, FunctionComponent, useContext } from '@bedrock-core/ui';
import { SettingsContext } from '../contexts';

/**
 * SettingsDisplay - Demonstrates reading multiple contexts
 * Grid Position: Row 1, Column 2
 */
export const SettingsDisplay: FunctionComponent = (): JSX.Element => {
  const settings = useContext(SettingsContext);

  return (
    <Panel width={220} height={140} x={240} y={10}>
      <Text width={220} height={20} x={250} y={20} value={'§l§bSettings Display'} />
      <Text width={220} height={15} x={250} y={50} value={`Volume: §e${settings.volume}%`} />
      <Text width={220} height={15} x={250} y={70} value={`Notify: ${settings.showNotifications ? '§aON' : '§cOFF'}`} />
      <Text width={220} height={15} x={250} y={100} value={'§7Multiple contexts'} />
      <Text width={220} height={15} x={250} y={120} value={'§7in one component'} />
    </Panel>
  );
};

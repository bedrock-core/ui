import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { Theme } from '../contexts';

interface ThemeControllerProps { onThemeChange: (theme: Theme) => void }

/**
 * ThemeController - Allows user to change the theme
 * Grid Position: Row 2, Column 3
 */
export const ThemeController: FunctionComponent<ThemeControllerProps> = ({ onThemeChange }): JSX.Element => (
  <Panel width={220} height={140} x={470} y={160}>
    <Text width={220} height={20} x={480} y={170} value={'§l§eTheme Control'} />

    <Button
      width={200}
      height={20}
      x={480}
      y={195}
      onPress={(): void => {
        onThemeChange('light');
      }}>
      <Text width={200} height={20} x={580} y={199} value={'§f■ Light'} />
    </Button>

    <Button
      width={200}
      height={20}
      x={480}
      y={220}
      onPress={(): void => {
        onThemeChange('dark');
      }}>
      <Text width={200} height={20} x={580} y={224} value={'§8■ Dark'} />
    </Button>

    <Button
      width={200}
      height={20}
      x={480}
      y={245}
      onPress={(): void => {
        onThemeChange('neon');
      }}>
      <Text width={200} height={20} x={580} y={249} value={'§d■ Neon'} />
    </Button>

    <Text width={220} height={12} x={480} y={275} value={'§7useContext provider'} />
  </Panel>
);


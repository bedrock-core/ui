import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { Theme } from '../contexts';

interface ThemeControllerProps { onThemeChange: (theme: Theme) => void }

/**
 * ThemeController - Allows user to change the theme
 * Grid Position: Row 2, Column 3
 */
export const ThemeController: FunctionComponent<ThemeControllerProps> = ({ onThemeChange }): JSX.Element => (
  <Panel width={192} height={140} x={10} y={160}>
    <Text width={192} height={20} x={10} y={10} value={'§l§eTheme Control'} />

    <Button
      width={172}
      height={20}
      x={10}
      y={35}
      onPress={(): void => {
        onThemeChange('light');
      }}>
      <Text width={172} height={20} x={5} y={5} value={'§f■ Light'} />
    </Button>

    <Button
      width={172}
      height={20}
      x={10}
      y={60}
      onPress={(): void => {
        onThemeChange('dark');
      }}>
      <Text width={172} height={20} x={5} y={5} value={'§8■ Dark'} />
    </Button>

    <Button
      width={172}
      height={20}
      x={10}
      y={85}
      onPress={(): void => {
        onThemeChange('neon');
      }}>
      <Text width={172} height={20} x={5} y={5} value={'§d■ Neon'} />
    </Button>

    <Text width={192} height={12} x={10} y={115} value={'§7useContext provider'} />
  </Panel>
);


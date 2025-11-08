import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { Theme } from '../contexts';

interface ThemeControllerProps { onThemeChange: (theme: Theme) => void }

/**
 * ThemeController - Allows user to change the theme
 * Grid Position: Row 2, Column 3
 */
export const ThemeController: FunctionComponent<ThemeControllerProps> = ({ onThemeChange }): JSX.Element => (
  <Panel width={192} height={140} x={10} y={160}>
    <Text width={192} height={20} x={10} y={10}>
      §l§eTheme Control
    </Text>

    <Button
      width={172}
      height={20}
      x={10}
      y={35}
      onPress={(): void => {
        onThemeChange('light');
      }}>
      <Text width={172} height={20} x={5} y={5}>
        §f■ Light
      </Text>
    </Button>

    <Button
      width={172}
      height={20}
      x={10}
      y={60}
      onPress={(): void => {
        onThemeChange('dark');
      }}>
      <Text width={172} height={20} x={5} y={5}>
        §8■ Dark
      </Text>
    </Button>

    <Button
      width={172}
      height={20}
      x={10}
      y={85}
      onPress={(): void => {
        onThemeChange('neon');
      }}>
      <Text width={172} height={20} x={5} y={5}>
        §d■ Neon
      </Text>
    </Button>

    <Text width={192} height={12} x={10} y={115}>
      §7useContext provider
    </Text>
  </Panel>
);


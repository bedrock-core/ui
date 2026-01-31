import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { Theme } from '../contexts';

interface ThemeControllerProps { onThemeChange: (theme: Theme) => void }

/**
 * ThemeController - Allows user to change the theme
 * Grid Position: Row 2, Column 3
 */
export const ThemeController: FunctionComponent<ThemeControllerProps> = ({ onThemeChange }): JSX.Element => (
  <Panel width={24} height={31} x={1} y={36}>
    <Text width={100} height={14} x={5} y={7}>
      {'§l§eTheme Control'}
    </Text>

    <Button
      width={90}
      height={14}
      x={5}
      y={25}
      onPress={(): void => {
        onThemeChange('light');
      }}
    >
      <Text width={100} height={100} x={3} y={25}>
        {'§f■ Light'}
      </Text>
    </Button>

    <Button
      width={90}
      height={14}
      x={5}
      y={43}
      onPress={(): void => {
        onThemeChange('dark');
      }}
    >
      <Text width={100} height={100} x={3} y={25}>
        {'§8■ Dark'}
      </Text>
    </Button>

    <Button
      width={90}
      height={14}
      x={5}
      y={61}
      onPress={(): void => {
        onThemeChange('neon');
      }}
    >
      <Text width={100} height={100} x={3} y={25}>
        {'§d■ Neon'}
      </Text>
    </Button>

    <Text width={100} height={9} x={5} y={82}>
      {'§7useContext provider'}
    </Text>
  </Panel>
);

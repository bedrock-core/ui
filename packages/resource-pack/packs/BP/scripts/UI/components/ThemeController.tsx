import { JSX, Panel, Text, Button, FunctionComponent } from '@bedrock-core/ui';
import { Theme } from '../contexts';

interface ThemeControllerProps { onThemeChange: (theme: Theme) => void }

/**
 * ThemeController - Allows user to change the theme
 * Grid Position: Row 2, Column 3
 */
export const ThemeController: FunctionComponent<ThemeControllerProps> = ({ onThemeChange }): JSX.Element => (
  <Panel flexDirection={'column'} padding={6} gap={4}>
    <Text>{'§eTheme Control'}</Text>

    <Button
      onPress={(): void => {
        onThemeChange('light');
      }}
    >
      <Text>{'§f■ Light'}</Text>
    </Button>

    <Button
      onPress={(): void => {
        onThemeChange('dark');
      }}
    >
      <Text>{'§8■ Dark'}</Text>
    </Button>

    <Button
      onPress={(): void => {
        onThemeChange('neon');
      }}
    >
      <Text>{'§d■ Neon'}</Text>
    </Button>

    <Text flex={1}> </Text>
    <Text>{'§7useContext provider'}</Text>
  </Panel>
);

import { JSX, Panel, Text, FunctionComponent } from '@bedrock-core/ui';
import { Button } from '@bedrock-core/ore-styled';
import { Theme } from '../contexts';

interface ThemeControllerProps { onThemeChange: (theme: Theme) => void }

/**
 * ThemeController - Allows user to change the theme
 * Grid Position: Row 2, Column 3
 */
export const ThemeController: FunctionComponent<ThemeControllerProps> = ({ onThemeChange }): JSX.Element => (
  <Panel flexDirection={'column'} padding={6} gap={4}>
    <Text>{'§eTheme Control'}</Text>

    <Button onPress={(): void => { onThemeChange('light'); }}>{'§f■ Light'}</Button>
    <Button variant={'secondary'} onPress={(): void => { onThemeChange('dark'); }}>{'§8■ Dark'}</Button>
    <Button variant={'contrast'} onPress={(): void => { onThemeChange('neon'); }}>{'§d■ Neon'}</Button>

    <Text flex={1}> </Text>
    <Text>{'§7useContext provider'}</Text>
  </Panel>
);

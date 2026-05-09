import { JSX, Panel, Text, FunctionComponent, useContext } from '@bedrock-core/ui';
import { ThemeContext, Theme } from '../contexts';

/**
 * ThemeDisplay - Demonstrates useContext
 * Reads theme from context and displays it
 * Grid Position: Row 1, Column 1
 */
export const ThemeDisplay: FunctionComponent = (): JSX.Element => {
  const theme = useContext<Theme>(ThemeContext);
  const themeColors: Record<Theme, string> = {
    light: '§f',
    dark: '§8',
    neon: '§d',
  };

  return (
    <Panel flexDirection={'column'} padding={6} gap={4}>
      <Text>{'§eTheme Display'}</Text>
      <Text>{'Current Theme:'}</Text>
      <Text>{`${themeColors[theme]}${theme.toUpperCase()}`}</Text>
      <Text flex={1}> </Text>
      <Text>{'§7Uses useContext'}</Text>
      <Text>{'§7to read theme'}</Text>
    </Panel>
  );
};

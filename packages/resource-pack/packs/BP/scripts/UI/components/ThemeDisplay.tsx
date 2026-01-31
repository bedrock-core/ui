import { JSX, Panel, Text, FunctionComponent, useContext } from '@bedrock-core/ui';
import { ThemeContext, Theme } from '../contexts';

/**
 * ThemeDisplay - Demonstrates useContext
 * Reads theme from context and displays it
 * Grid Position: Row 1, Column 1
 */
export const ThemeDisplay: FunctionComponent = (): JSX.Element => {
  const theme = useContext(ThemeContext);
  const themeColors: Record<Theme, string> = {
    light: '§f',
    dark: '§8',
    neon: '§d',
  };

  return (
    <Panel width={24} height={31} x={1} y={2}>
      <Text width={100} height={14} x={5} y={7}>
        {'§l§eTheme Display'}
      </Text>
      <Text width={100} height={11} x={5} y={25}>
        {'§lCurrent Theme:'}
      </Text>
      <Text width={100} height={14} x={5} y={39}>
        {`${themeColors[theme]}§l${theme.toUpperCase()}`}
      </Text>
      <Text width={100} height={11} x={5} y={64}>
        {'§7Uses useContext'}
      </Text>
      <Text width={100} height={11} x={5} y={79}>
        {'§7to read theme'}
      </Text>
    </Panel>
  );
};

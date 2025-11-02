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
    <Panel width={192} height={140} x={10} y={10}>
      <Text width={192} height={20} x={10} y={10} value={'§l§eTheme Display'} />
      <Text width={192} height={15} x={10} y={35} value={'§lCurrent Theme:'} />
      <Text width={192} height={20} x={10} y={55} value={`${themeColors[theme]}§l${theme.toUpperCase()}`} />
      <Text width={192} height={15} x={10} y={90} value={'§7Uses useContext'} />
      <Text width={192} height={15} x={10} y={110} value={'§7to read theme'} />
    </Panel>
  );
};

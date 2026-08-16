/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import type { DisplayText } from '@bedrock-core/i18n';
import { Button, Image, Panel, Text, useTranslationResolver } from '@bedrock-core/ui-runtime';
import { theme } from './tokens';

export interface MenuRowProps extends ControlProps {
  /** Leading thumbnail texture. Omit for a text-only row. */
  icon?: string;
  /** Thumbnail edge in px. Defaults to the theme's row icon size. */
  iconSize?: number;
  /** First line — the row's name. */
  title: DisplayText;
  /** Second line, rendered muted. Omit for a single-line row. */
  subtitle?: DisplayText;
  /** Trailing `>` affordance. Default `true` — set `false` for rows that select rather than navigate. */
  chevron?: boolean;
  /**
   * Indent level for nested index rows. Each step insets the row's whole BOX, not its
   * contents — a child row is visibly narrower than its section header, which is what makes
   * the nesting readable. Padding alone left every row the same width and the hierarchy
   * disappeared as soon as two levels sat next to each other.
   */
  depth?: number;
  onPress?: () => unknown | Promise<unknown>;
}

/**
 * The browse-screen row: thumbnail + title + one-line subtitle + chevron on the
 * dropdown-option face. Every list in this UI — addons, guide index, config scopes,
 * entity rosters — is built from this so the rows read as one system.
 *
 * A disabled row keeps its face (there is no disabled option texture) and greys its
 * text instead, matching how the button variants signal the same state.
 */
export function MenuRow({
  icon,
  iconSize,
  title,
  subtitle,
  chevron = true,
  depth = 0,
  enabled = true,
  onPress,
  ...layout
}: MenuRowProps): JSX.Element {
  const row = theme.components.menuRow;
  const { font, scale } = row.textStyle;
  const titleColor = enabled ? row.textStyle.color : row.textStyle.disabledColor;
  const subtitleColor = enabled ? row.textStyle.muted : row.textStyle.mutedDisabled;

  // Literal strings carry the row color as a §-prefix; localized content (a
  // RawMessage, or a string the resolver knows as a key) passes through
  // untouched — a color prefix would break key resolution.
  const resolver = useTranslationResolver();

  const line = (source: DisplayText, color: string, shadow: boolean): JSX.Element => {
    const literal = typeof source === 'string' && (source === '' || resolver?.(source) === undefined);

    return (
      <Text font={font} scale={scale} shadow={shadow} maxLines={1} overflow={'ellipsis'}>
        {literal ? `${color}${source}` : source}
      </Text>
    );
  };

  const lines: JSX.Element[] = [line(title, titleColor, true)];

  if (subtitle) { lines.push(line(subtitle, subtitleColor, false)); }

  const children: JSX.Element[] = [];

  if (icon !== undefined) {
    children.push(<Image texture={icon} width={iconSize ?? row.iconSize} height={iconSize ?? row.iconSize} />);
  }

  children.push(<Panel flexDirection={'column'} flexGrow={1} flexShrink={1} justifyContent={'center'} gap={0}>{lines}</Panel>);

  if (chevron) { children.push(<Text>{`${subtitleColor}>`}</Text>); }

  return (
    <Button
      background={row.textures.background}
      backgroundHover={row.textures.backgroundHover}
      backgroundPressed={row.textures.backgroundPressed}
      backgroundLocked={row.textures.background}
      padding={row.padding}
      // Cross-axis stretch rather than `width: '100%'` — an explicit full width plus the
      // indent margin would overflow its container by exactly the indent.
      alignSelf={'stretch'}
      marginLeft={depth * theme.tokens.spacing.lg}
      justifyContent={'flex-start'}
      enabled={enabled}
      onPress={onPress}
      {...layout}
    >
      <Panel flexDirection={'row'} alignItems={'center'} gap={row.gap} width={'100%'}>
        {children}
      </Panel>
    </Button>
  );
}

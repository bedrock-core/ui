/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Button, Image, Panel, Text } from '@bedrock-core/ui-runtime';
import { theme } from './tokens';

/** Text that is either literal (colorable with §-codes) or a localization key. */
export type TextSource = { text: string } | { key: string };

export interface MenuRowProps extends ControlProps {
  /** Leading thumbnail texture. Omit for a text-only row. */
  icon?: string;
  /** Thumbnail edge in px. Defaults to the theme's row icon size. */
  iconSize?: number;
  /** First line — the row's name. */
  title: TextSource;
  /** Second line, rendered muted. Omit for a single-line row. */
  subtitle?: TextSource;
  /** Trailing `>` affordance. Default `true` — set `false` for rows that select rather than navigate. */
  chevron?: boolean;
  /** Indent level; each step adds one `md` of left padding, for nested index rows. */
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

  const line = (source: TextSource, color: string, shadow: boolean): JSX.Element =>
    'key' in source
      ? <Text font={font} scale={scale} shadow={shadow} maxLines={1} overflow={'ellipsis'} localizationKey={source.key} />
      : <Text font={font} scale={scale} shadow={shadow} maxLines={1} overflow={'ellipsis'}>{`${color}${source.text}`}</Text>;

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
      width={'100%'}
      justifyContent={'flex-start'}
      enabled={enabled}
      onPress={onPress}
      {...layout}
    >
      <Panel flexDirection={'row'} alignItems={'center'} gap={row.gap} width={'100%'} paddingLeft={depth * theme.tokens.spacing.md}>
        {children}
      </Panel>
    </Button>
  );
}

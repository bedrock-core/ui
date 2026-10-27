/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX, PressEvent } from '@bedrock-core/ui-runtime';
import type { DisplayText } from '@bedrock-core/i18n';
import { Button, Image, Panel, Text, useTranslationResolver } from '@bedrock-core/ui-runtime';
import type { DestinationKey } from '@bedrock-core/navigation';
import { Link } from '@bedrock-core/navigation';
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
   * Whether this row is the list's current selection. A selecting list (`chevron={false}`)
   * leaves one row standing after the press, and without a face of its own that row was
   * indistinguishable from the rest — the detail pane was the only thing saying which one it
   * was showing. A navigating list never has one, so this defaults to `false`.
   */
  selected?: boolean;
  /**
   * Indent level for nested index rows. Each step insets the row's whole BOX, not its
   * contents — a child row is visibly narrower than its section header, which is what makes
   * the nesting readable. Padding alone left every row the same width and the hierarchy
   * disappeared as soon as two levels sat next to each other.
   */
  depth?: number;
  onPress?: (event: PressEvent) => unknown | Promise<unknown>;
  /**
   * The screen this row opens, `<addon>:<name>`. A row with one is a `<Link>`,
   * so where it leads is data rather than a handler — which is what lets an
   * index of rows be shown by an addon running none of this one's script.
   */
  to?: DestinationKey;
  /** With `to`: take the place of the screen this row is on rather than stacking over it. */
  replace?: boolean;
  /** Truncates a literal title to this many UTF-16 code units. */
  titleMaxLength?: number;
  /** Truncates a literal subtitle without changing whether the line exists. */
  subtitleMaxLength?: number;
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
  selected = false,
  depth = 0,
  enabled = true,
  onPress,
  to,
  replace,
  titleMaxLength,
  subtitleMaxLength,
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

  const line = (source: DisplayText, color: string, shadow: boolean, maxLength: number | undefined): JSX.Element => {
    const literal = typeof source === 'string' && (source === '' || resolver?.(source) === undefined);

    return (
      <Text font={font} scale={scale} shadow={shadow} color={color === row.textStyle.muted ? row.textStyle.mutedRgb : undefined} maxLines={1} overflow={'ellipsis'} {...maxLength === undefined ? {} : { maxLength }}>
        {literal ? `${color}${source}` : source}
      </Text>
    );
  };

  const lines: JSX.Element[] = [line(title, titleColor, true, titleMaxLength)];

  if (subtitle !== undefined) {
    lines.push(line(subtitle, subtitleColor, false, subtitleMaxLength));
  }

  const children: JSX.Element[] = [];

  if (icon !== undefined) {
    children.push(<Image texture={icon} width={iconSize ?? row.iconSize} height={iconSize ?? row.iconSize} />);
  }

  children.push(<Panel flexDirection={'column'} flexGrow={1} flexShrink={1} justifyContent={'center'} gap={0}>{lines}</Panel>);

  if (chevron) { children.push(<Text>{`${subtitleColor}>`}</Text>); }

  // Caption values are independent of the input surface so the compiler can
  // detect changing text without changing the row's structure.
  const face = (
    <Panel
      flexDirection={'row'}
      alignItems={'center'}
      gap={row.gap}
      width={'100%'}
      padding={row.padding}
      zIndex={12}
    >
      {children}
    </Panel>
  );

  const styled = {
    // A selected row wears the selected face in EVERY state, and `undefined` is how it does
    // that: `resolveStateBackgrounds` fills each missing state from the base, so one texture
    // covers hover, press and locked. Leaving the ordinary hover face on meant pointing at
    // the current row washed the selection out — hover is LIGHTER than the selected fill.
    background: selected ? row.textures.backgroundSelected : row.textures.background,
    backgroundHover: selected ? undefined : row.textures.backgroundHover,
    backgroundPressed: selected ? undefined : row.textures.backgroundPressed,
    backgroundLocked: selected ? undefined : row.textures.background,
    padding: row.padding,
    // Cross-axis stretch rather than `width: '100%'` — an explicit full width plus the
    // indent margin would overflow its container by exactly the indent.
    alignSelf: 'stretch' as const,
    marginLeft: depth * theme.tokens.spacing.lg,
    justifyContent: 'flex-start' as const,
    enabled,
    ...layout,
    children: face,
  };

  const { background, backgroundHover, backgroundPressed, backgroundLocked } = styled;
  const surface = {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    width: '100%' as const,
    height: '100%' as const,
    background,
    backgroundHover,
    backgroundPressed,
    backgroundLocked,
    enabled,
  };

  return (
    <Panel alignSelf={'stretch'} marginLeft={styled.marginLeft} {...layout}>
      {to === undefined ? Button({ ...surface, onPress }) : Link({ ...surface, to, ...replace === true ? { replace: true } : {} })}
      {face}
    </Panel>
  );
}

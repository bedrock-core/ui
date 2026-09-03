/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX, PressEvent } from '@bedrock-core/ui-runtime';
import { Button, Panel, Text, useTranslationResolver } from '@bedrock-core/ui-runtime';
import type { DisplayText } from '@bedrock-core/i18n';
import { theme } from './tokens';

export interface HeaderProps extends ControlProps {
  /** The screen's own name, first in the trail. */
  title: DisplayText;
  /** Trail after the title, e.g. scope and entity labels: `title > … > …`. */
  breadcrumbs?: DisplayText[];
  /** Omit to hide the back control (the slot keeps its width, so the title stays centered). */
  onBack?: (event: PressEvent) => unknown;
  /** Omit to hide the close control. */
  onClose?: (event: PressEvent) => unknown;
}

/**
 * Ore header bar: icon-only back button, breadcrumb trail, close button. Every screen
 * in a stack wears this so the chrome does not shift as the player moves between them.
 *
 * Each segment of the trail is a `Text` of its own, so a segment that is a key stays a
 * key all the way to the client and resolves in the player's language — a compiled
 * screen bakes a label per key, and one label cannot hold two. The trail cannot then
 * be clipped as a unit; the last segment, the one that grows with the page title,
 * is the one that shrinks and ellipsises.
 */
export function Header({ title, breadcrumbs, onBack, onClose, ...layout }: HeaderProps): JSX.Element {
  const resolver = useTranslationResolver();
  const h = theme.components.header;
  const { font, scale, color, colorRgb, separator } = h.textStyle;
  const segments: DisplayText[] = [title, ...breadcrumbs ?? []];

  // A literal takes the trail colour as a § code, the way it always did. A key
  // or a RawMessage cannot carry one — the client resolves it — so it goes to
  // `Text` bare, coloured through the label instead.
  const isLiteral = (value: DisplayText): value is string => typeof value === 'string' && resolver?.(value) === undefined;

  const trail = segments.flatMap((value, index): JSX.Element[] => [
    ...index === 0 ? [] : [<Text font={font} scale={scale} flexShrink={0}>{`${separator} > `}</Text>],
    <Text
      font={font}
      scale={scale}
      maxLines={1}
      flexShrink={index === segments.length - 1 ? 1 : 0}
      color={isLiteral(value) ? undefined : colorRgb}
    >
      {isLiteral(value) ? `${color}${value}` : value}
    </Text>,
  ]);

  return (
    <Panel
      flexDirection={'row'}
      alignItems={'center'}
      gap={h.gap}
      padding={h.padding}
      marginTop={1}
      marginLeft={1}
      marginRight={1}
      background={h.textures.background}
      {...layout}
    >
      {onBack
        ? <Button width={h.iconSize} height={h.iconSize} background={h.textures.back} backgroundHover={h.textures.backHover} backgroundPressed={h.textures.backPressed} onPress={onBack} />
        : <Panel width={h.iconSize} height={h.iconSize} />}
      <Panel flexGrow={1} flexShrink={1} flexDirection={'row'} justifyContent={'center'} alignItems={'center'}>
        {trail}
      </Panel>
      {onClose
        ? <Button width={h.iconSize} height={h.iconSize} background={h.textures.close} backgroundHover={h.textures.closeHover} backgroundPressed={h.textures.closePressed} onPress={onClose} />
        : <Panel width={h.iconSize} height={h.iconSize} />}
    </Panel>
  );
}

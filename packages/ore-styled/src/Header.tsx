/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Button, Panel, Text, TranslationKeysContext, useContext } from '@bedrock-core/ui-runtime';
import { theme } from './tokens';

/** One label in the header trail — raw text (colorable) or a localization key. */
export type BreadcrumbSegment = { text: string } | { key: string };

export interface HeaderProps extends ControlProps {
  /** The screen's own name, first in the trail. */
  title: string | BreadcrumbSegment;
  /** Trail after the title, e.g. scope and entity labels: `title > … > …`. */
  breadcrumbs?: BreadcrumbSegment[];
  /** Omit to hide the back control (the slot keeps its width, so the title stays centered). */
  onBack?: () => void;
  /** Omit to hide the close control. */
  onClose?: () => void;
}

/**
 * Ore header bar: icon-only back button, breadcrumb trail, close button. Every screen
 * in a stack wears this so the chrome does not shift as the player moves between them.
 *
 * The trail is one raw string (not per-segment `Text`s) so a single `overflow: ellipsis`
 * can clip the whole thing — sibling label controls don't share a width budget, so
 * ellipsis-per-segment can't truncate the row as a unit. Keys resolve through
 * `TranslationKeysContext` up front, same as `Text` does internally; missing keys fall
 * back to the key itself.
 */
export function Header({ title, breadcrumbs, onBack, onClose, ...layout }: HeaderProps): JSX.Element {
  const translationKeys = useContext(TranslationKeysContext);
  const h = theme.components.header;
  const { color, separator } = h.textStyle;

  const resolve = (segment: BreadcrumbSegment): string =>
    'key' in segment ? (translationKeys?.[segment.key] ?? segment.key) : segment.text;

  const head = typeof title === 'string' ? title : resolve(title);
  const trail = (breadcrumbs ?? []).map(resolve).join(`${separator} > ${color}`);

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
      <Panel flexGrow={1} flexShrink={1} justifyContent={'center'} alignItems={'center'}>
        <Text font={h.textStyle.font} scale={h.textStyle.scale} maxLines={1}>
          {trail ? `${color}${head}${separator} > ${color}${trail}` : `${color}${head}`}
        </Text>
      </Panel>
      {onClose
        ? <Button width={h.iconSize} height={h.iconSize} background={h.textures.close} backgroundHover={h.textures.closeHover} backgroundPressed={h.textures.closePressed} onPress={onClose} />
        : <Panel width={h.iconSize} height={h.iconSize} />}
    </Panel>
  );
}

/** @jsxImportSource @bedrock-core/ui-runtime */
import { theme } from '@bedrock-core/ore-styled';
import { Button, Panel, Text, TranslationKeysContext, useContext, type JSX } from '@bedrock-core/ui-runtime';

const { spacing } = theme.tokens;

const HEADER_BG = 'textures/ui/ore-styled/header/background';
const ICON_CLOSE = 'textures/ui/ore-styled/button/close/background';
const ICON_CLOSE_HOVER = 'textures/ui/ore-styled/button/close/background_hover';
const ICON_CLOSE_PRESSED = 'textures/ui/ore-styled/button/close/background_pressed';
const ICON_BACK = 'textures/ui/ore-styled/button/back/background';
const ICON_BACK_HOVER = 'textures/ui/ore-styled/button/back/background_hover';
const ICON_BACK_PRESSED = 'textures/ui/ore-styled/button/back/background_pressed';

/** One segment of the breadcrumb trail after the addon title — a raw label or a localization key. */
export type BreadcrumbSegment = { text: string } | { key: string };

export interface GuideHeaderProps {
  /** Raw text (colorable) — the guide's title, not the page's. */
  title: string;
  /** Trail after the title, e.g. category and page labels: `title > … > …`. */
  breadcrumbs?: BreadcrumbSegment[];
  onBack?: () => void;
  onClose: () => void;
}

/**
 * Ore header bar: icon-only back button, breadcrumb trail, close button.
 *
 * The trail is one raw string (not per-segment `Text`s) so a single
 * `overflow: ellipsis` can clip the whole thing — sibling label controls
 * don't share a width budget, so ellipsis-per-segment can't truncate the
 * row as a unit. Keys resolve through `TranslationKeysContext` up front,
 * same as `Text` does internally; missing keys fall back to the key itself.
 */
export function GuideHeader({ title, breadcrumbs, onBack, onClose }: GuideHeaderProps): JSX.Element {
  const translationKeys = useContext(TranslationKeysContext);

  const trail = (breadcrumbs ?? [])
    .map(segment => ('key' in segment ? (translationKeys?.[segment.key] ?? segment.key) : segment.text))
    .join('§8 > §0');

  return (
    <Panel flexDirection={'row'} alignItems={'center'} gap={spacing.sm} padding={spacing.sm} marginTop={1} marginLeft={1} marginRight={1} background={HEADER_BG}>
      {onBack
        ? <Button width={15} height={15} background={ICON_BACK} backgroundHover={ICON_BACK_HOVER} backgroundPressed={ICON_BACK_PRESSED} onPress={onBack} />
        : <Panel width={15} height={15} />}
      <Panel flexGrow={1} flexShrink={1} justifyContent={'center'} alignItems={'center'}>
        <Text font={'minecraftTen'} scale={1.2} maxLines={1}>
          {trail ? `§0${title}§8 > §0${trail}` : `§0${title}`}
        </Text>
      </Panel>
      <Button width={15} height={15} background={ICON_CLOSE} backgroundHover={ICON_CLOSE_HOVER} backgroundPressed={ICON_CLOSE_PRESSED} onPress={onClose} />
    </Panel>
  );
}

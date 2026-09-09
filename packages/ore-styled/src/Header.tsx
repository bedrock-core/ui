/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX, PressEvent } from '@bedrock-core/ui-runtime';
import { Button, Panel } from '@bedrock-core/ui-runtime';
import type { DisplayText } from '@bedrock-core/i18n';
import { theme } from './tokens';
import { Trail, type TrailSegment } from './Trail';

export interface HeaderProps extends ControlProps {
  /** The screen's own name, first in the trail. Optional only with `segments`. */
  title?: DisplayText;
  /** Trail after the title, e.g. scope and entity labels: `title > … > …`. */
  breadcrumbs?: DisplayText[];
  /** Omit to hide the back control (the slot keeps its width, so the title stays centered). */
  onBack?: (event: PressEvent) => unknown;
  /** Omit to hide the close control. */
  onClose?: (event: PressEvent) => unknown;
  /**
   * Characters the title reserves. A compiled screen bakes its title unless it
   * is told how long a live one may be; set this where the title is a string
   * known only when the screen is shown, such as an addon's name.
   */
  titleMaxLength?: number;
  /**
   * The whole trail as segments, live ones included, in place of `title` and
   * `breadcrumbs`: for a trail whose later segments are only known when the
   * screen is shown.
   */
  segments?: readonly TrailSegment[];
}

/**
 * Ore header bar: icon-only back button, breadcrumb trail, close button. Every screen
 * in a stack wears this so the chrome does not shift as the player moves between them.
 */
export function Header({ title, breadcrumbs, onBack, onClose, titleMaxLength, segments, ...layout }: HeaderProps): JSX.Element {
  const h = theme.components.header;
  const own: DisplayText = title ?? '';
  const trail: readonly TrailSegment[] = segments ?? [
    titleMaxLength === undefined ? own : { text: own, maxLength: titleMaxLength },
    ...breadcrumbs ?? [],
  ];

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
      <Trail segments={trail} flexGrow={1} flexShrink={1} />
      {onClose
        ? <Button width={h.iconSize} height={h.iconSize} background={h.textures.close} backgroundHover={h.textures.closeHover} backgroundPressed={h.textures.closePressed} onPress={onClose} />
        : <Panel width={h.iconSize} height={h.iconSize} />}
    </Panel>
  );
}

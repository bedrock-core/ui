/** @jsxImportSource @bedrock-core/ui-runtime */
import type { JSX } from '@bedrock-core/ui-runtime';
import { type BooleanProps, Switch } from './Switch';
import { theme } from './tokens';

export type ToggleProps = BooleanProps;

/**
 * A switch: the caption on the left, the switch pinned to the right.
 *
 * The settings-row reading order. What it IS — a boolean on whatever screen
 * it is drawn — is {@link Switch}; this is the theme's switch shape over it.
 */
export function Toggle(props: ToggleProps): JSX.Element {
  const t = theme.components.toggle;

  return Switch(props, {
    width: t.width,
    height: t.height,
    caption: 'before',
    faces: {
      background: t.textures.off,
      backgroundHover: t.textures.offHover,
      backgroundLocked: t.textures.offDisabled,
      checkedBackground: t.textures.on,
      checkedHover: t.textures.onHover,
      checkedLocked: t.textures.onDisabled,
    },
  });
}

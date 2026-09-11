import type { JSX, ButtonProps as PrimitiveButtonProps } from '@bedrock-core/ui-runtime';
import { Button as PrimitiveButton, Link, Text } from '@bedrock-core/ui-runtime';
import type { ScreenKey } from '@bedrock-core/ui-runtime';
import { theme } from './tokens';

export type ButtonVariant = 'hero' | 'primary' | 'secondary' | 'contrast' | 'danger' | 'realm' | 'transparent';

export interface ButtonProps extends PrimitiveButtonProps {
  variant?: ButtonVariant;
  /**
   * The screen this button opens, `<addon>:<name>`. A button with one is a
   * `<Link>`: where it leads is data the build reads, so a screen of them can be
   * shown by an addon that has none of this one's script.
   */
  to?: ScreenKey;
}

export function Button({
  variant = 'primary',
  enabled = true,
  onPress,
  to,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  const t = theme.components.button.variants[variant].textures;
  const ts = theme.components.button.variants[variant].textStyle;

  const resolvedChildren = typeof children === 'string'
    ? Text({ font: ts.font, scale: ts.scale, children: `${enabled ? ts.color : ts.disabledColor}${children}` })
    : children;

  const styled = {
    background: t.default,
    backgroundHover: t.hover,
    backgroundPressed: t.pressed,
    backgroundLocked: t.disabled,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingLeft: theme.components.button.padding.x,
    paddingRight: theme.components.button.padding.x,
    paddingTop: theme.components.button.padding.y,
    paddingBottom: variant === 'hero' ? 10 : theme.components.button.padding.y,
    ...rest,
    enabled,
    children: resolvedChildren,
  };

  return to === undefined ? PrimitiveButton({ ...styled, onPress }) : Link({ ...styled, to });
}

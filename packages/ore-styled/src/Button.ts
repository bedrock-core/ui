import type { JSX, ButtonProps as PrimitiveButtonProps } from '@bedrock-core/ui';
import { Button as PrimitiveButton, Text } from '@bedrock-core/ui';
import { theme } from './tokens';

export type ButtonVariant = 'hero' | 'primary' | 'secondary' | 'contrast' | 'danger' | 'realm';

export interface ButtonProps extends PrimitiveButtonProps {
  variant?: ButtonVariant;
}

export function Button({
  variant = 'primary',
  enabled = true,
  onPress,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  const t = theme.components.button.variants[variant].textures;
  const ts = theme.components.button.variants[variant].textStyle;

  const resolvedChildren = typeof children === 'string'
    ? Text({ font: ts.font, scale: ts.scale, children: `${enabled ? ts.color : ts.disabledColor}${children}` })
    : children;

  return PrimitiveButton({
    background: t.default,
    backgroundHover: t.hover,
    backgroundPressed: t.pressed,
    backgroundLocked: t.disabled,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: theme.components.button.padding.x,
    paddingRight: theme.components.button.padding.x,
    paddingTop: theme.components.button.padding.y,
    paddingBottom: variant === 'hero' ? 10 : theme.components.button.padding.y,
    ...rest,
    enabled,
    onPress,
    children: resolvedChildren,
  });
}

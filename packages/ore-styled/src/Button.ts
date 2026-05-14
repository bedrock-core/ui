import { Button as PrimitiveButton, Text } from '@bedrock-core/ui';
import type { ButtonProps as PrimitiveButtonProps, JSX } from '@bedrock-core/ui';

import { BUTTON_TEXT_STYLE, SPACING, TEXTURES } from './tokens';

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
  const t = TEXTURES.button[variant];
  const ts = BUTTON_TEXT_STYLE[variant];

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
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: variant === 'hero' ? 10 : SPACING.sm,
    ...rest,
    enabled,
    onPress,
    children: resolvedChildren,
  });
}

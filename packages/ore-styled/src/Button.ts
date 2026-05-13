import { Button as PrimitiveButton } from '@bedrock-core/ui';
import type { ButtonProps as PrimitiveButtonProps, JSX } from '@bedrock-core/ui';

import { SPACING, TEXTURES } from './tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'contrast' | 'danger' | 'realm';

export interface ButtonProps extends PrimitiveButtonProps {
  variant?: ButtonVariant;
}

export function Button({
  variant = 'primary',
  onPress,
  children,
  ...rest
}: ButtonProps): JSX.Element {
  const t = TEXTURES.button[variant];

  return PrimitiveButton({
    background: t.default,
    backgroundHover: t.hover,
    backgroundPressed: t.pressed,
    backgroundLocked: t.disabled,
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    ...rest,
    onPress,
    children,
  });
}

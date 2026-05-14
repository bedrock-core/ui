import { Image, type ControlProps, type JSX } from '@bedrock-core/ui';

import { TEXTURES } from './tokens';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerVariant = 'default' | 'light' | 'dark';

// Pixel thickness per variant
const THICKNESS: Record<DividerVariant, number> = {
  default: 2,
  light: 1,
  dark: 1,
};

export interface DividerProps extends ControlProps {
  orientation?: DividerOrientation;
  variant?: DividerVariant;
}

export function Divider({ orientation = 'horizontal', variant = 'default', ...rest }: DividerProps): JSX.Element {
  const isHorizontal = orientation === 'horizontal';
  const texture = isHorizontal
    ? TEXTURES.divider.horizontal[variant]
    : TEXTURES.divider.vertical[variant];
  const thickness = THICKNESS[variant];

  return (
    <Image
      texture={texture}
      height={isHorizontal ? thickness : undefined}
      width={isHorizontal ? undefined : thickness}
      {...rest}
    />
  );
}

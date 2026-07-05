/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Panel } from '@bedrock-core/ui-runtime';
import { theme } from './tokens';

export type CardVariant = 'default' | 'light' | 'dark' | 'raised' | 'raised-light' | 'raised-dark';

export interface CardProps extends ControlProps {
  children?: JSX.Node;
  variant?: CardVariant;
}

export function Card({ children, variant = 'raised', ...layout }: CardProps): JSX.Element {
  const v = theme.components.card.variants[variant];

  return (
    <Panel
      background={v.textures.background}
      padding={theme.components.card.padding}
      gap={theme.components.card.gap}
      flexDirection={'column'}
      {...layout}
    >
      {children}
    </Panel>
  );
}

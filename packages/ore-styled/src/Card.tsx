import { Panel } from '@bedrock-core/ui';
import type { ControlProps, JSX } from '@bedrock-core/ui';

import { SPACING, TEXTURES } from './tokens';

export interface CardProps extends ControlProps {
  children?: JSX.Node;
}

export function Card({ children, ...layout }: CardProps): JSX.Element {
  return (
    <Panel
      background={TEXTURES.card.background}
      padding={SPACING.md}
      gap={SPACING.sm}
      flexDirection={'column'}
      {...layout}
    >
      {children}
    </Panel>
  );
}

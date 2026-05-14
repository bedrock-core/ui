/** @jsxImportSource @bedrock-core/ui */
import type { ControlProps, JSX } from '@bedrock-core/ui';
import { Panel } from '@bedrock-core/ui';
import { theme } from './tokens';

export interface CardProps extends ControlProps {
  children?: JSX.Node;
}

export function Card({ children, ...layout }: CardProps): JSX.Element {
  return (
    <Panel
      background={theme.components.card.textures.background}
      padding={theme.components.card.padding}
      gap={theme.components.card.gap}
      flexDirection={'column'}
      {...layout}
    >
      {children}
    </Panel>
  );
}

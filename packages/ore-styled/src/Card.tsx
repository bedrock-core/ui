/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Panel } from '@bedrock-core/ui-runtime';
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

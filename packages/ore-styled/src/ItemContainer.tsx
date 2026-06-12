/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Panel } from '@bedrock-core/ui-runtime';
import type { Container } from '@minecraft/server';
import { ItemSlot } from './ItemSlot';
import { theme } from './tokens';

export interface ItemContainerProps extends ControlProps {
  container: Container;
  columns?: number;
  start?: number;
  count?: number;
}

export function ItemContainer({
  container,
  columns = 9,
  start = 0,
  count,
  ...layout
}: ItemContainerProps): JSX.Element {
  const slotSize = theme.components.itemSlot.size;
  const slotCount = count ?? container.size - start;

  return (
    <Panel width={columns * slotSize} flexDirection={'row'} wrap={'wrap'} {...layout}>
      {Array.from({ length: slotCount }, (_, i) => (
        <ItemSlot slot={container.getSlot(start + i)} />
      ))}
    </Panel>
  );
}

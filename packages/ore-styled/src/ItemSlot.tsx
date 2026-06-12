/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Image, ItemRenderer, Panel } from '@bedrock-core/ui-runtime';
import type { ContainerSlot } from '@minecraft/server';
import { theme } from './tokens';

/** @experimental */
export interface ItemSlotProps extends ControlProps {
  slot?: ContainerSlot;
  overlay?: string;
}

/** @experimental */
export function ItemSlot({ slot, overlay, ...layout }: ItemSlotProps): JSX.Element {
  const { size, textures } = theme.components.itemSlot;
  const item = slot?.getItem();

  return (
    <Panel width={size} height={size} background={textures.slot} padding={1} {...layout}>
      {item != null
        ? <ItemRenderer item={item} />
        : overlay != null
          ? <Image width={16} height={16} texture={overlay} />
          : undefined}
    </Panel>
  );
}

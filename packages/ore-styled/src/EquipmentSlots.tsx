/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ControlProps, JSX } from '@bedrock-core/ui-runtime';
import { Panel } from '@bedrock-core/ui-runtime';
import { EquipmentSlot, type EntityEquippableComponent } from '@minecraft/server';
import { ItemSlot } from './ItemSlot';
import { theme } from './tokens';

export interface EquipmentSlotsProps extends ControlProps {
  equippable: EntityEquippableComponent;
}

export function EquipmentSlots({ equippable, ...layout }: EquipmentSlotsProps): JSX.Element {
  const eq = theme.components.itemSlot.textures.equipment;

  return (
    <Panel flexDirection={'column'} {...layout}>
      <ItemSlot slot={equippable.getEquipmentSlot(EquipmentSlot.Head)} overlay={eq.helmet} />
      <ItemSlot slot={equippable.getEquipmentSlot(EquipmentSlot.Chest)} overlay={eq.chestplate} />
      <ItemSlot slot={equippable.getEquipmentSlot(EquipmentSlot.Legs)} overlay={eq.leggings} />
      <ItemSlot slot={equippable.getEquipmentSlot(EquipmentSlot.Feet)} overlay={eq.boots} />
      <ItemSlot slot={equippable.getEquipmentSlot(EquipmentSlot.Offhand)} overlay={eq.shield} />
    </Panel>
  );
}

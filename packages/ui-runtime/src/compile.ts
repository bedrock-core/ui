/**
 * Build-time surface, for tooling rather than for addons.
 *
 * A compiled screen is rendered on a build machine — no player, no world — by
 * the same pipeline a form uses, under the build owner. What a compiler needs
 * from here is the built tree, the allocation, and the contract the emitted
 * JSON UI has to agree with the runtime on. Kept off the main entry so an
 * addon never imports it by accident.
 */

export { buildContainerTree, buildScreenOnce } from './hosts/chest/build';

// What is live, found by rendering rather than by being told. Build-only: the
// runtime is handed the answer.
export { probeLiveness } from './core/ir/probe';
export type { FrozenText, Probe, ShapeChange } from './core/ir/probe';

export { allocate } from './hosts/chest/allocate';
export type { Allocation, CellRole, ChannelEntry, SlotEntry } from './hosts/chest/allocate';

// The form host's half of the same seam. Named apart from the chest's rather
// than exported as a namespace, because `hosts/<host>/index.ts` pulls in that
// host's runtime and a build machine has no use for it.
export { allocate as allocateForm } from './hosts/form/allocate';
export type { EntryEntry, Placement as FormPlacement } from './hosts/form/allocate';
export {
  COLLECTION as FORM_COLLECTION, compiledPrefix, DETAILS_BINDING as FORM_DETAILS_BINDING,
  ENCODING_MAX, ENCODING_MIN, keyFrom as formKeyFrom, titleFor as formTitleFor,
} from './hosts/form/contract';
export { analyze, claim } from './core/ir';
export type { Analysis, CellClaim, ChannelClaim, Claims } from './core/ir';
export {
  BLANK_CODE, BLANK_VALUE, CHARSET, charsetLang, encode, MAX_CODE, UNKNOWN_CODE,
} from './hosts/chest/charset';
export {
  COLLECTION, COUNT_ITEM, GUARD_ITEM, GUARD_ITEM_AUX, joinKey, KEY_PREFIX, LAYOUT_PROPERTY, layoutKey,
  MAX_LAYOUT, OWNED_LORE, OWNED_PROPERTY, PROTOCOL_ITEM, PROTOCOL_ITEM_AUX, SENTINEL_SLOTS, splitKey,
  STATE_PROPERTY, TRANSPORT_ITEM, TRANSPORT_ITEM_AUX,
} from './hosts/chest/contract';

// What the compiler reads off a built tree: every component owns the shape of
// its own props, so the readers live beside the components.
export { BACKGROUND_SLOT_TYPE } from './components/Background';
export { BUTTON_TYPE, isExitButton } from './components/Button';
export { CONTAINER_TYPE, containerEntity, containerHandlers, containerRoot } from './components/Container';
export { IMAGE_TYPE } from './components/Image';
export { PANEL_TYPE } from './components/Panel';
export { SCROLL_SLOT_TYPE } from './components/Scroll';
export { isForeignSlot, SLOT_CELL, SLOT_TYPE, slotInteractive, slotRole, slotSource } from './components/Slot';
export type { SlotSource } from './components/Slot';
export { SLOT_GRID_TYPE, slotGridConfig } from './components/SlotGrid';
export type { SlotGridConfig } from './components/SlotGrid';
export { isTextElementType, liveTextLength } from './components/Text';
export { childElements, concreteRoots, isElement } from './core/guards';
export { ContainerScreenError } from './core/types';
export { CANONICAL_SCREEN } from '@bedrock-core/flexbox';

// What the compiler needs to draw a built element the way the form render pack
// draws it, and to look through the wrappers the build leaves in the tree.
export { UNSTYLED_TEXTURE } from './components/control';
export { labelFontFields } from './components/Form/controlPayload';
export { TEXT_SHADOW_TYPE, TEXT_SHADOW_WRAP_TYPE } from './components/Text';
export { isTransparentType } from './core/componentRegistry';

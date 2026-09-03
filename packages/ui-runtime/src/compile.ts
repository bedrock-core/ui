/**
 * Build-time surface, for tooling rather than for addons.
 *
 * A compiled screen is rendered on a build machine — no player, no world — by
 * the same pipeline a form uses, under the build owner. What a compiler needs
 * from here is the built tree, the allocation, and the contract the emitted
 * JSON UI has to agree with the runtime on. Kept off the main entry so an
 * addon never imports it by accident.
 */

// The native modal fields. A compiled screen lays them out but does not draw
// them: the widget is the engine's, instantiated by vanilla's row factory.
export {
  MODAL_DROPDOWN_SLOT_TYPE, MODAL_FORM_BUTTON_SLOT_TYPE, MODAL_INLINE_SELECT_SLOT_TYPE,
  MODAL_INPUT_SLOT_TYPE, MODAL_SLIDER_SLOT_TYPE, MODAL_TOGGLE_SLOT_TYPE,
} from './components/Form';

export { buildContainerTree, buildScreenOnce, buildScreenTree } from './hosts/chest/build';

// What is live, found by rendering rather than by being told. Build-only: the
// runtime is handed the answer.
export { probeLiveness } from './core/ir/probe';
export type { FrozenText, Probe, ShapeChange } from './core/ir/probe';

export { allocate } from './hosts/chest/allocate';
export type { Allocation, CellRole, ChannelEntry, SlotEntry } from './hosts/chest/allocate';

// The form host's half of the same seam. Named apart from the chest's rather
// than exported as a namespace, because `hosts/<host>/index.ts` pulls in that
// host's runtime and a build machine has no use for it.
export { allocate as allocateForm, allocateModal, hasModalRoot, type ModalRow } from './hosts/form/allocate';
export type { EntryEntry, Placement as FormPlacement } from './hosts/form/allocate';

// The liveness seam the compiled snapshot rides: the build detects a carried
// visible by probing, records the ordinals, and the runtime marks the same
// elements back onto its tree. The fingerprint and the baked strings are what
// `debug` diffs a render against.
export { bakedTexts, shapeOf } from './core/ir/probe';
export type { CompiledSnapshot } from './core/render/screens';
export {
  COLLECTION as FORM_COLLECTION, compiledPrefix, DETAILS_BINDING as FORM_DETAILS_BINDING,
  ENCODING_MAX, ENCODING_MIN, keyFrom as formKeyFrom, titleFor as formTitleFor,
  VOCABULARY_MAX, VOCABULARY_MIN,
} from './hosts/form/contract';
export { analyze, claim, visiblesAt } from './core/ir';
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
export { SCROLL_SLOT_TYPE, SCROLL_TRACK_WIDTH } from './components/Scroll';
export { TAB_SLOT_TYPE, TABS_SLOT_TYPE } from './components/Tabs';
export { DISCLOSURE_HEADER_SLOT_TYPE, DISCLOSURE_SLOT_TYPE } from './components/Disclosure';
export { LIST_SLOT_TYPE, listCapacity, listCount } from './components/List';
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

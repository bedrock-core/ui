/**
 * The runtime half of a compiled container screen.
 *
 * The build freezes the layout; this drives everything alive in it, with one
 * blunt fact to work with: an item moving is the only signal a container gives
 * back. No click event, no lock that makes a slot read-only, no way to veto a
 * move. Buttons are items taken and put back, and a role is enforced a tick
 * later rather than prevented.
 */

export { allocate } from './allocate';
export type { Allocation, CellRole, ChannelEntry, SlotEntry } from './allocate';
export { analyze } from './analyze';
export type { Analysis } from './analyze';
export { buildContainerTree } from './build';
export {
  BLANK_CODE, BLANK_VALUE, CHARSET, charsetLang, encode, MAX_CODE, UNKNOWN_CODE,
} from './charset';
export {
  COLLECTION, COUNT_ITEM, GUARD_ITEM, GUARD_ITEM_AUX, joinKey, KEY_PREFIX, LAYOUT_PROPERTY, layoutKey,
  MAX_LAYOUT, OWNED_LORE, OWNED_PROPERTY, PROTOCOL_ITEM, PROTOCOL_ITEM_AUX, SENTINEL_SLOTS, splitKey,
  STATE_PROPERTY, TRANSPORT_ITEM, TRANSPORT_ITEM_AUX,
} from './contract';
export { createContainerScreen } from './session';
export type { ContainerScreen, ContainerScreenConfig } from './session';

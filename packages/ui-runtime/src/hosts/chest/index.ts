/**
 * The chest host, entire: what an addon imports as
 * `@bedrock-core/ui/container`, and what the build imports to compile one.
 *
 * Three kinds of thing live under this folder, and the split is the point:
 * `contract.ts` and `charset.ts` are what the emitted JSON UI and the runtime
 * must agree on, `allocate.ts` numbers a screen's needs into container
 * indices, and `runtime/` drives a live screen. `host.ts` is the host contract
 * itself and is deliberately reachable without any of the rest — the registry
 * imports it directly, so nothing that merely asks which host a tree belongs
 * to drags the runtime in behind it.
 *
 * The build freezes the layout; the runtime drives everything alive in it,
 * with one blunt fact to work with: an item moving is the only signal a
 * container gives back. No click event, no lock that makes a slot read-only,
 * no way to veto a move. Buttons are items taken and put back, and a role is
 * enforced a tick later rather than prevented.
 */

export { allocate } from './allocate';
export type { Allocation, CellRole, ChannelEntry, SlotEntry } from './allocate';
export { analyze } from '../../core/ir';
export type { Analysis } from '../../core/ir';
export { buildContainerTree } from './build';
export {
  BLANK_CODE, BLANK_VALUE, CHARSET, charsetLang, encode, MAX_CODE, UNKNOWN_CODE,
} from './charset';
export {
  BLOCK_SLOT_LIMIT, blockCapacityError, COLLECTION, COUNT_ITEM, GUARD_ITEM, GUARD_ITEM_AUX, joinKey, KEY_PREFIX,
  LAYOUT_PROPERTY, layoutKey, MAX_LAYOUT, OWNED_LORE, OWNED_PROPERTY, PROTOCOL_ITEM,
  PROTOCOL_ITEM_AUX, SENTINEL_SLOTS, splitKey, STATE_PROPERTY, TRANSPORT_ITEM, TRANSPORT_ITEM_AUX,
} from './contract';
export { createContainerScreen } from './runtime/session';
export type { ContainerScreen, ContainerScreenConfig } from './runtime/session';
export type { ContainerHost } from '../../components/Container';
export type { ScreenHost } from '../../core/events';

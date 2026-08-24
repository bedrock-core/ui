/**
 * The runtime half of a compiled container screen.
 *
 * The compiler freezes the layout; this drives everything alive in it. What it
 * has to work with is one blunt fact: an item moving is the only signal a
 * container gives back. No click event, no lock that makes a slot read-only, no
 * way to veto a move. Buttons are items taken and put back, and read-only is
 * enforced a tick later rather than prevented.
 */

export { createContainerScreen } from './session';
export type { ContainerScreen } from './session';
export {
  claim, isOwned, OWNED_LORE, OWNED_PROPERTY, setOrdinal, setRatio, TRANSPORT_ORDINAL,
} from './marker';
export type {
  ChannelCarrier, ChannelSpec, ContainerScreenConfig, ScreenHandle, SlotRole, SlotSpec,
} from './types';
export { BLANK_CODE, BLANK_VALUE, CHARSET, charsetLang, encode, MAX_CODE, UNKNOWN_CODE } from './charset';

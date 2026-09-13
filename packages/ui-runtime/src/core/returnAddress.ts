/**
 * Where a player came from when another realm asked this one to show a screen.
 *
 * A screen is drawn by the addon whose pack holds it, so navigating across
 * addons means asking that addon's realm to show it. The player then has a
 * stack in the realm that is drawing and none of the one they came from, and
 * `back()` out of the bottom of that stack has to land somewhere.
 *
 * A return ADDRESS is what makes that one hop possible without a stack shared
 * between realms: the asking realm says who it is and what it had on screen,
 * the drawing realm keeps it beside its own history, and `back()` uses it only
 * once the local stack is empty. One entry per player, because a realm can only
 * have been asked by whoever asked last.
 *
 * The target is opaque here. What it means is the asking realm's to decide —
 * it is handed straight back to it — so nothing about the shape of a target
 * reaches the runtime.
 */

/** The realm a player arrived from, and what it shows them when they go back. */
export interface ReturnAddress {
  /** The addon whose realm asked this one to show a screen. */
  readonly realm: string;
  /** What that realm is asked to show again, in whatever shape it understands. */
  readonly target: unknown;
}

const addresses = new Map<string, ReturnAddress>();

/**
 * Records where a player came from, or forgets it when called with nothing.
 *
 * Called by whatever serves the "show this" request, before the screen is
 * shown: a request that carries no address is a player who did not come from
 * another realm, and the previous address must not outlive them.
 */
export function setReturnAddress(playerId: string, address: ReturnAddress | undefined): void {
  if (address === undefined) {
    addresses.delete(playerId);
  } else {
    addresses.set(playerId, address);
  }
}

/** Where a player came from, when another realm asked this one to show them a screen. */
export function returnAddressOf(playerId: string): ReturnAddress | undefined {
  return addresses.get(playerId);
}

/**
 * Takes the address and forgets it, so the hop happens once.
 *
 * Going back is arriving: the realm the player returns to sets its own address
 * (or none) as it shows them, and a leftover here would send a later `back()`
 * round the same hop a second time.
 */
export function takeReturnAddress(playerId: string): ReturnAddress | undefined {
  const address = addresses.get(playerId);

  addresses.delete(playerId);

  return address;
}

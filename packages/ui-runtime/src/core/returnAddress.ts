/**
 * Where a player came from when another realm asked this one to show a screen.
 *
 * A screen is drawn by the addon whose pack holds it, so navigating across
 * addons means asking that addon's realm to show it. The player then has a
 * stack in the realm that is drawing and none of the ones they came through,
 * and `back()` out of the bottom of that stack has to land somewhere.
 *
 * The way back is a PATH: one entry per realm the player crossed, oldest first,
 * carried in the request rather than shared between realms. A realm handing the
 * player on appends itself; a realm they come back to is handed the rest. So a
 * chain of any depth walks back through exactly the realms it came through, and
 * no realm has to remember anything for anyone else.
 *
 * The target of each entry is opaque here. What it means is that realm's to
 * decide — it is handed straight back to it — so nothing about the shape of a
 * target reaches the runtime.
 */

/** One realm a player crossed, and what it shows them when they come back to it. */
export interface ReturnAddress {
  /** The addon whose realm asked for the hop. */
  readonly realm: string;
  /** What that realm is asked to show again, in whatever shape it understands. */
  readonly target: unknown;
}

/**
 * How many realms deep a way back may be.
 *
 * The path travels in every request, so it is bounded like the local history is.
 * Crossing more realms than this drops the OLDEST hop: the far end of a long
 * chain is the part a player is least likely to walk all the way back to, and a
 * request that grows without limit is worse than a way back that ends early.
 */
export const RETURN_DEPTH = 8;

const paths = new Map<string, readonly ReturnAddress[]>();

/**
 * Records the way back a request carried, or forgets it when called with nothing.
 *
 * Called by whatever serves the "show this" request, before the screen is
 * shown: a request with no path is a player who did not come from another
 * realm, and the previous path must not outlive them.
 */
export function setReturnPath(playerId: string, path: readonly ReturnAddress[] | undefined): void {
  if (path === undefined || path.length === 0) {
    paths.delete(playerId);
  } else {
    paths.set(playerId, path.slice(-RETURN_DEPTH));
  }
}

/** The realms behind this one for a player, oldest first. */
export function returnPathOf(playerId: string): readonly ReturnAddress[] {
  return paths.get(playerId) ?? [];
}

/**
 * The way back with THIS realm appended: what a request handing the player on
 * carries, so the realm receiving it can walk the whole chain home.
 */
export function pathThrough(playerId: string, here: ReturnAddress): readonly ReturnAddress[] {
  return [...returnPathOf(playerId), here].slice(-RETURN_DEPTH);
}

/**
 * Takes the nearest realm off the path: where a `back()` at the bottom of the
 * local stack goes, and what is left for the realm it goes to.
 *
 * The rest is kept here as well as returned, so a caller that cannot deliver
 * the hop leaves the player's way back as it was.
 */
export function takeReturnStep(playerId: string): { step: ReturnAddress; rest: readonly ReturnAddress[] } | undefined {
  const path = paths.get(playerId);
  const step = path?.[path.length - 1];

  if (path === undefined || step === undefined) {
    return undefined;
  }

  const rest = path.slice(0, -1);

  setReturnPath(playerId, rest);

  return { step, rest };
}

/** Forgets a player's way back entirely — they are no longer in the UI. */
export function clearReturnPath(playerId: string): void {
  paths.delete(playerId);
}

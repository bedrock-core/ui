/**
 * Which screen each player is looking at, and which ones they came through.
 *
 * A compiled screen's shape is frozen, so a stack of screens cannot be a stack
 * of components swapped inside one root — each screen is its own layout, shown
 * by its own title. What a stack IS here is a stack of KEYS: `navigate()` pushes
 * the one being left, `back()` pops it and shows it again.
 *
 * A leaf module on purpose: `render()` records what it showed and `navigate()`
 * reads it, and those two already point at each other.
 */

/** The key of the screen each player is being shown, when it is a compiled one. */
const shown = new Map<string, string>();

/** The keys behind it, oldest first. */
const stacks = new Map<string, string[]>();

/** How many screens back a player can go before the oldest is dropped. */
const DEPTH = 32;

/** Records what a player is now looking at. Called by `render()`, for every path into it. */
export function noteShown(playerId: string, key: string | undefined): void {
  if (key === undefined) {
    shown.delete(playerId);
  } else {
    shown.set(playerId, key);
  }
}

/** The key of the screen a player is looking at, when it was navigated to by one. */
export function shownKey(playerId: string): string | undefined {
  return shown.get(playerId);
}

/** Puts the screen a player is looking at behind them, so `back()` returns to it. */
export function pushHistory(playerId: string): void {
  const key = shown.get(playerId);

  if (key === undefined) {
    return;
  }

  const stack = stacks.get(playerId) ?? [];

  stack.push(key);
  stacks.set(playerId, stack.slice(-DEPTH));
}

/** Takes the screen behind a player off the stack, or undefined when there is none. */
export function popHistory(playerId: string): string | undefined {
  return stacks.get(playerId)?.pop();
}

/** The keys behind a player, oldest first. */
export function historyOf(playerId: string): readonly string[] {
  return stacks.get(playerId) ?? [];
}

/**
 * Forgets where a player has been. The screen they are looking at is forgotten
 * with it — a session that ended is not a screen to go back to.
 */
export function clearHistory(playerId: string): void {
  stacks.delete(playerId);
  shown.delete(playerId);
}

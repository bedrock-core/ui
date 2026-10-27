/**
 * Which screen each player is looking at, and which ones they came through.
 *
 * Server navigation stores serializable destinations, including parameters and
 * confirmed client selections. Resident pages still switch entirely locally.
 *
 * Render lifecycle notifications supply the active compiled screen identity.
 */
import type { Player } from '@minecraft/server';
import { whyNotPlainData } from '@bedrock-core/ui-runtime';
import type { NavigationState } from '../static/common';
import { isNavigationState } from '../static/state';

/** Navigator states last confirmed by a server action, keyed by navigator id. */
export interface NavigationCheckpoint {
  readonly navigatorStates?: Readonly<Record<string, NavigationState>>;
}

/** Serializable inputs needed to reopen one destination. */
export interface ScreenLocation extends NavigationCheckpoint {
  readonly key: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

/** Current destination and previous destinations, oldest first. */
export interface NavigationSnapshot {
  readonly current?: ScreenLocation;
  readonly history: readonly ScreenLocation[];
}

/** The current logical destination, independently of its private host component. */
const shown = new Map<string, ScreenLocation>();

/** Previous destinations, oldest first. */
const stacks = new Map<string, ScreenLocation[]>();
const revisions = new Map<string, number>();
const opening = new Map<string, ScreenLocation>();

/** Destination scope active while its host opens a render. */
export function openingLocation(playerId: string): ScreenLocation | undefined {
  return opening.get(playerId);
}

/** How many screens back a player can go before the oldest is dropped. */
const DEPTH = 32;

/** Supplies a logical destination to synchronous host renders inside a navigation. */
export function withNavigationLocation<T>(playerId: string, location: ScreenLocation, open: () => T): T {
  const previous = opening.get(playerId);

  opening.set(playerId, location);

  try {
    return open();
  } finally {
    if (previous === undefined) { opening.delete(playerId); } else { opening.set(playerId, previous); }
  }
}

/** Records a compiled screen identity received from a renderer or reference presenter. */
export function noteShown(playerId: string, key: string | undefined, params?: Readonly<Record<string, unknown>>): void {
  const destination = opening.get(playerId);

  if (destination !== undefined) {
    noteLocation(playerId, destination);

    return;
  }

  if (key === undefined) {
    shown.delete(playerId);
    changed(playerId);
  } else if (shown.get(playerId)?.key !== key || params !== undefined) {
    const previous = shown.get(playerId);

    noteLocation(playerId, {
      ...previous?.key === key ? previous : {},
      key,
      ...params === undefined ? {} : { params },
    });
  }
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
  changed(playerId);
}

/** Takes the screen behind a player off the stack, or undefined when there is none. */
export function popHistory(playerId: string): string | undefined {
  return popLocation(playerId)?.key;
}

/** The keys behind a player or player ID, oldest first. */
export function historyOf(player: Player | string): readonly string[] {
  const playerId = typeof player === 'string' ? player : player.id;

  return (stacks.get(playerId) ?? []).map(location => location.key);
}

/**
 * Forgets where a player has been. The screen they are looking at is forgotten
 * with it — a session that ended is not a screen to go back to.
 */
export function clearHistory(playerId: string): void {
  stacks.delete(playerId);
  shown.delete(playerId);
  changed(playerId);
}

function changed(playerId: string): void {
  revisions.set(playerId, (revisions.get(playerId) ?? 0) + 1);
}

/** A revision for rejecting completions belonging to an older navigation. */
export function navigationRevision(player: Player | string): number {
  return revisions.get(typeof player === 'string' ? player : player.id) ?? 0;
}

function copy<T>(value: T): T {
  const reason = whyNotPlainData(value, 'navigation');

  if (reason !== undefined) { throw new Error(`Navigation state must be plain data: ${reason}`); }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- plain data retains its shape through JSON
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Records a destination without changing its history. */
export function noteLocation(playerId: string, location: ScreenLocation): void {
  shown.set(playerId, copyLocation(location));
  changed(playerId);
}

/** Validates and copies public inputs before a host receives them. */
export function copyLocation(location: ScreenLocation): ScreenLocation {
  if (!isNavigationSnapshot({ current: location, history: [] })) { throw new Error('Invalid navigation location.'); }

  return copy(location);
}

/** A copy of the current destination, including its parameters and selections. */
export function currentLocation(player: Player | string): ScreenLocation | undefined {
  const location = shown.get(typeof player === 'string' ? player : player.id);

  return location === undefined ? undefined : copy(location);
}

/** Confirms client page/tab context at a server action or handoff boundary. */
export function checkpoint(player: Player | string, selection: NavigationCheckpoint): void {
  const playerId = typeof player === 'string' ? player : player.id;
  const current = shown.get(playerId);

  if (current !== undefined) {
    noteLocation(playerId, { ...current,
      ...current.navigatorStates === undefined && selection.navigatorStates === undefined
        ? {}
        : { navigatorStates: { ...current.navigatorStates, ...selection.navigatorStates } } });
  }
}

/** Removes and returns the nearest complete destination. */
export function popLocation(playerId: string): ScreenLocation | undefined {
  const location = stacks.get(playerId)?.pop();

  if (location !== undefined) { changed(playerId); }

  return location === undefined ? undefined : copy(location);
}

/** A transport-safe copy of the player's navigation state. */
export function navigationSnapshot(player: Player | string): NavigationSnapshot {
  const playerId = typeof player === 'string' ? player : player.id;
  const current = shown.get(playerId);

  return copy({ ...current === undefined ? {} : { current }, history: stacks.get(playerId) ?? [] });
}

/** Installs validated navigation state from a host. */
export function restoreNavigation(player: Player | string, snapshot: NavigationSnapshot): void {
  const playerId = typeof player === 'string' ? player : player.id;
  const data = copy(snapshot);

  if (!isNavigationSnapshot(data)) { throw new Error('Invalid navigation snapshot.'); }

  if (data.current === undefined) { shown.delete(playerId); } else { shown.set(playerId, data.current); }

  stacks.set(playerId, [...data.history].slice(-DEPTH));
  changed(playerId);
}

/** Checks untrusted wire state before it becomes a player's navigation state. */
export function isNavigationSnapshot(value: unknown): value is NavigationSnapshot {
  if (whyNotPlainData(value, 'navigation') !== undefined || value === null || typeof value !== 'object' || Array.isArray(value)) { return false; }

  const location = (entry: unknown): entry is ScreenLocation => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry) || !('key' in entry)
      || typeof entry.key !== 'string' || entry.key.length === 0) { return false; }

    if (Object.keys(entry).some(key => !['key', 'params', 'navigatorStates'].includes(key))) { return false; }

    if ('params' in entry && (entry.params === null || typeof entry.params !== 'object' || Array.isArray(entry.params))) { return false; }

    if ('navigatorStates' in entry && (entry.navigatorStates === null || typeof entry.navigatorStates !== 'object' || Array.isArray(entry.navigatorStates)
      || !Object.values(entry.navigatorStates).every(state => isNavigationState(state)))) { return false; }

    return true;
  };

  return 'history' in value && Array.isArray(value.history) && value.history.length <= DEPTH
    && value.history.every(location) && (!('current' in value) || location(value.current));
}

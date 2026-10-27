import type { Owner } from '../fabric/owner';
import { whyNotPlainData } from '../plainData';

/** Why a server-side render session ended. */
export type RenderEndReason = 'dismissed' | 'closed' | 'released' | 'error';

/** Renderer identity; starting a session does not acknowledge native client paint. */
export interface RenderSession {
  readonly id: number;
  readonly ownerId: string;
  readonly ownerKind: 'player' | 'entity' | 'block';
  readonly screenKey?: string;
  readonly title?: string;
  /** Root props captured only when the entire object is plain serializable data. */
  readonly params?: Readonly<Record<string, unknown>>;
}

export type RenderLifecycleEvent
  = | { readonly type: 'started'; readonly session: RenderSession }
    | { readonly type: 'replaced'; readonly session: RenderSession; readonly previous: RenderSession }
    | { readonly type: 'ended'; readonly session: RenderSession; readonly reason: RenderEndReason };

export type RenderLifecycleListener = (event: RenderLifecycleEvent) => void;

const listeners = new Set<RenderLifecycleListener>();
const active = new Map<string, RenderSession>();
let nextId = 0;

function deliver(listener: RenderLifecycleListener, event: RenderLifecycleEvent): void {
  try { listener(event); } catch (error: unknown) {
    console.warn(`[ui-runtime] render lifecycle listener failed: ${String(error)}`);
  }
}

function emit(event: RenderLifecycleEvent): void {
  const snapshot = Object.freeze(event);

  for (const listener of [...listeners]) { deliver(listener, snapshot); }
}

/**
 * Observes server render sessions. Replay supplies current sessions to a late subscriber.
 * State updates and client-only selections do not emit lifecycle transitions.
 * Listener errors are reported and do not stop rendering. Returns an idempotent disposer.
 */
export function observeRenderLifecycle(listener: RenderLifecycleListener, options: { readonly replay?: boolean } = {}): () => void {
  listeners.add(listener);

  if (options.replay === true) {
    for (const session of [...active.values()]) { deliver(listener, Object.freeze({ type: 'started', session })); }
  }

  return (): void => { listeners.delete(listener); };
}

/** Current immutable session facts, keyed by render owner. */
export function renderSession(ownerId: string): RenderSession | undefined {
  return active.get(ownerId);
}

function freezeData(value: unknown): void {
  if (value === null || typeof value !== 'object') { return; }

  for (const child of Object.values(value)) { freezeData(child); }

  Object.freeze(value);
}

/** Internal transition shared by form and container render hosts. */
export function startRenderSession(owner: Owner, info: { readonly screenKey?: string; readonly title?: string; readonly params?: Readonly<Record<string, unknown>> }): void {
  if (owner.kind === 'build') { return; }

  const previous = active.get(owner.id);
  let params: Readonly<Record<string, unknown>> | undefined;

  if (info.params !== undefined && Object.keys(info.params).length > 0 && whyNotPlainData(info.params, 'params') === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the complete object was validated as plain data before copying
    params = JSON.parse(JSON.stringify(info.params)) as Readonly<Record<string, unknown>>;
    freezeData(params);
  }

  const session: RenderSession = Object.freeze({ id: ++nextId, ownerId: owner.id, ownerKind: owner.kind,
    ...info.screenKey === undefined ? {} : { screenKey: info.screenKey },
    ...info.title === undefined ? {} : { title: info.title },
    ...params === undefined ? {} : { params } });

  active.set(owner.id, session);
  emit(previous === undefined ? { type: 'started', session } : { type: 'replaced', session, previous });
}

/** A stale completion cannot end a successor session. */
export function finishRenderSession(ownerId: string, reason: RenderEndReason, sessionId?: number): void {
  const session = active.get(ownerId);

  if (session === undefined || (sessionId !== undefined && session.id !== sessionId)) { return; }

  active.delete(ownerId);
  emit({ type: 'ended', session, reason });
}

import type { Player } from '@minecraft/server';
import { playerOwner } from '../fabric/owner';
import { triggerCleanup } from './session';
import type { RenderEndReason } from './notifications';
import { hasLiveChain, isRefreshPending, requestRefresh } from './session';
import { uiManager } from '@minecraft/server-ui';
import { renderSession } from './notifications';

export interface EndRenderOptions {
  /** Also closes the player's native forms. Defaults to true. */
  readonly close?: boolean;
  /** Lifecycle reason supplied to observers. Defaults to closed. */
  readonly reason?: RenderEndReason;
}

/** Releases a player's render tree and session; a handoff can leave native forms open. */
export function endRender(player: Player, options: EndRenderOptions = {}): void {
  triggerCleanup(playerOwner(player), options.close !== false, options.reason ?? 'closed');
}

/** Re-presents the current root with its existing fibers after an external state change. */
export function refreshRender(player: Player): void {
  const owner = playerOwner(player);

  if (!hasLiveChain(owner)) { return; }

  const session = renderSession(owner.id)?.id;

  requestRefresh(owner);
  void Promise.resolve().then(() => {
    if (renderSession(owner.id)?.id === session && isRefreshPending(owner)) { uiManager.closeAllForms(player); }
  });
}

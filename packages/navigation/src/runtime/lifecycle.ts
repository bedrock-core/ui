import { observeRenderLifecycle, renderSession } from '@bedrock-core/ui-runtime';
import { clearHistory, noteShown, openingLocation } from './history';

let installed = false;

/** Attaches navigation policy only when a navigation operation or component is used. */
export function ensureNavigationLifecycle(): void {
  if (installed) { return; }

  installed = true;
  observeRenderLifecycle((event) => {
    if (event.session.ownerKind !== 'player') { return; }

    const id = event.session.ownerId;

    if (event.type === 'ended') {
      if (renderSession(id) !== undefined) { return; }

      if (event.reason !== 'released' && openingLocation(id) === undefined) { clearHistory(id); }
    } else if (renderSession(id)?.id === event.session.id) {
      noteShown(id, event.session.screenKey, event.session.params);
    }
  }, { replay: true });
}

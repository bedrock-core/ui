/**
 * What every screen needs and nothing hands down as props: the runtime it reads from, and the
 * player it is rendering for.
 *
 * Both are provided once by `App` and are non-null for the whole tree, so the hooks throw on a
 * missing value rather than returning `null`. The player one matters beyond convenience — it is
 * the actor every config request is authorized against, and a screen that silently rendered
 * without it would be making unrestricted requests.
 */
import { TranslationKeysContext, createContext, useContext } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import type { Runtime } from '@bedrock-core/server-runtime';

export const CoreContext = createContext<Runtime | null>(null);

/** The player this UI session is rendering for — resolves "self"/"current dimension" scopes. */
export const PlayerContext = createContext<Player | null>(null);

/**
 * Read the runtime from context. `App` always provides it, so a missing value is a
 * programming error — throw rather than propagate a nullable `Runtime` through every screen.
 */
export function useCore(): Runtime {
  const core = useContext(CoreContext);

  if (!core) { throw new Error('useCore must be called within the config UI <App> (CoreContext missing)'); }

  return core;
}

/**
 * Read the viewing player from context. `App` always provides it, so a missing value is a
 * programming error — throw rather than let a screen silently drop the actor from a config
 * request and get treated as an unrestricted programmatic caller.
 */
export function usePlayer(): Player {
  const player = useContext(PlayerContext);

  if (!player) { throw new Error('usePlayer must be called within the config UI <App> (PlayerContext missing)'); }

  return player;
}

/**
 * Resolve a localization key to this player's language, the same way `Text` does internally.
 *
 * Needed wherever a key has to become a STRING rather than stay a key: a breadcrumb trail is
 * one label made of several parts, and a native modal's heading is raw text with no key at all.
 * Rendering the key in those places is what put `drav0011.shop.name` on screen. Unknown keys
 * fall back to the key itself, matching `Text`.
 */
export function useLocalized(key: string): string {
  return useContext(TranslationKeysContext)?.[key] ?? key;
}

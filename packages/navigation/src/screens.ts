/**
 * An addon's compiled screens, as references another realm can show.
 *
 * A screen is compiled into the addon's own resource pack, so every client already holds what
 * draws it. What a realm needs in order to SHOW one it did not build is small — per screen the
 * compiled title, the value each entry carries and where each press leads — and that is what an
 * addon announces under `core-ui/reference`:
 *
 * ```ts
 * import { screens } from '@bedrock-core/navigation';
 * import { uiReference } from '@bedrock-core/generated/ui';
 *
 * screens(core).provide(uiReference());
 * ```
 *
 * With it published, `navigate('<addon>:<screen>')` works in any realm in the world, whether or
 * not the owner's script is running there. The announcement carries the envelope only: the
 * renderer owns the shape and narrows it at the point of use.
 */
import { Announcement, isRecord, type Runtime } from '@bedrock-core/server-runtime';
import type { State } from '@bedrock-core/sync';

/**
 * The envelope a screen reference travels in. `screens` is
 * `Record<key, ScreenReference>` to the renderer.
 */
export interface AddonScreens {
  v: 1;
  /** The owning addon's UI namespace — the half every one of its keys starts with. */
  ns: string;
  screens: unknown;
}

/** The envelope check {@link ScreensRegistry} reads through. */
export function isAddonScreens(value: unknown): value is AddonScreens {
  return isRecord(value) && typeof value['ns'] === 'string' && isRecord(value['screens']);
}

/** Each addon's screens, announced, with one lookup across all of them. */
export class ScreensRegistry extends Announcement<AddonScreens> {
  constructor(state: State, addonId: string) {
    super(state, addonId, 'ui/reference', isAddonScreens);
  }

  /**
   * The reference for one screen key, from whichever addon published it.
   *
   * Searched rather than parsed out of the key: a key's first half is the owner's UI namespace,
   * which an addon may set apart from the namespace it syncs under, so the only reliable answer
   * is the one the published records give.
   */
  find(key: string): unknown {
    for (const namespace of this.namespaces()) {
      const published = this.of(namespace);
      const screens = published?.screens;

      if (isRecord(screens) && key in screens) {
        return screens[key];
      }
    }

    return undefined;
  }
}

const registries = new WeakMap<Runtime, ScreensRegistry>();

/**
 * The screen references on a runtime: `screens(core).provide(uiReference())` to publish this
 * addon's, `screens(core).find(key)` to resolve one key from whichever addon owns it.
 *
 * One registry per runtime, created on the first call and kept, so every caller in a realm
 * reads and writes the same feed.
 */
export function screens(core: Runtime): ScreensRegistry {
  const found = registries.get(core);

  if (found !== undefined) {
    return found;
  }

  const registry = new ScreensRegistry(core.node.state, core.id);

  registries.set(core, registry);

  return registry;
}

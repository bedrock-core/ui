/**
 * Resolving a screen key, wherever the screen came from.
 *
 * A compiled screen is navigated by key, and a realm can show one it did not build from the
 * reference its owner published. The framework is the exception that shapes this file: it has a
 * row in the addon list but no realm behind it — nothing calls `core.register()` on its behalf —
 * so it can never publish anything. Its screens are baked into the render pack instead, and the
 * table the render pack's build emits into this package stands in for what an addon would have
 * published.
 */
import { isScreenReference, type ScreenReference } from '@bedrock-core/ui-runtime';
import type { Runtime } from '@bedrock-core/server-runtime';
import { FRAMEWORK_SCREENS } from './generated/framework.generated';

/** The list row and guide id for the framework's own entry. Not a namespace — nothing registers it. */
export const FRAMEWORK_ADDON_ID = 'bedrock-core';

/** The screen a guide opens on, by the namespace its screens are compiled under. */
export const guideKeyOf = (namespace: string): string => `${namespace}:guide_home`;

/**
 * The same index with a back control on it.
 *
 * A screen's shape is frozen, so the index a HOST opened — and which the reader has to be able to
 * leave — is a second compiled screen rather than a state of the first. Its back press closes the
 * form, which ends the walk and hands the reader back to whatever opened the guide.
 */
export const guideBackKeyOf = (namespace: string): string => `${namespace}:guide_home_back`;

/**
 * The reference for one screen key: the framework's own table first, then whatever addon
 * published a screen by that key.
 *
 * Narrowing here is where an announcement becomes a reference — a peer publishing something
 * malformed reads as "no such screen" rather than crashing the screen showing it.
 */
export function screenReferenceFor(core: Runtime, key: string): ScreenReference | undefined {
  const own = FRAMEWORK_SCREENS.screens[key];

  if (own !== undefined) {
    return own;
  }

  const published = core.screens.find(key);

  return isScreenReference(published) ? published : undefined;
}

/**
 * The key of an addon's guide index, or `undefined` when it published no guide.
 *
 * The addon half of a key is the namespace its SCREENS were compiled under, which an addon may
 * set apart from the namespace it syncs under — so it is read off what the addon published
 * rather than assumed to be its id.
 */
export function guideKeyFor(core: Runtime, addonId: string, options: { back?: boolean } = {}): string | undefined {
  const namespace = addonId === FRAMEWORK_ADDON_ID ? FRAMEWORK_SCREENS.ns : core.screens.of(addonId)?.ns;

  if (namespace === undefined) {
    return undefined;
  }

  // The back variant when the caller has somewhere to hand the reader back to, and only if the
  // guide was built with one — an addon that compiled its guide before the variant existed still
  // opens, without the control.
  const wanted = options.back === true ? guideBackKeyOf(namespace) : guideKeyOf(namespace);
  const fallback = guideKeyOf(namespace);

  if (screenReferenceFor(core, wanted) !== undefined) {
    return wanted;
  }

  return screenReferenceFor(core, fallback) === undefined ? undefined : fallback;
}

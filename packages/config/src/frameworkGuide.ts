/**
 * The framework's own entry in the addon list.
 *
 * The framework has a row in the list but no realm behind it — nothing calls
 * `core.register()` on its behalf — so it can never publish a guide or a page
 * the way an addon does. Both are baked into the render pack instead, and the
 * references the render pack's build emits into this package stand in for
 * what an addon would have published.
 */
import { isGuideManifest, isGuideReference } from '@bedrock-core/guides';
import type { GuideManifest, GuideReference } from '@bedrock-core/guides';
import type { Runtime } from '@bedrock-core/server-runtime';
import { FRAMEWORK_GUIDE } from './generated/framework.generated';

/** The list row and guide id for the framework's own entry. Not a namespace — nothing registers it. */
export const FRAMEWORK_ADDON_ID = 'bedrock-core';

/**
 * The compiled guide behind an addon id, or `undefined` if there is none to present.
 *
 * The framework's is this package's own; an addon's arrives over replicated state as the
 * runtime's opaque envelope, and narrowing here is where it becomes a reference — a peer
 * publishing something malformed reads as "no guide" rather than crashing the screen.
 */
export function guideReferenceFor(core: Runtime, addonId: string): GuideReference | undefined {
  if (addonId === FRAMEWORK_ADDON_ID) { return FRAMEWORK_GUIDE; }

  const stored = core.guides.referenceOf(addonId);

  return isGuideReference(stored) ? stored : undefined;
}

/**
 * The serialized guide manifest behind an addon id, or `undefined` if the addon published
 * none. Only an addon built before compiled guides publishes one; the framework never does.
 */
export function manifestFor(core: Runtime, addonId: string): GuideManifest | undefined {
  if (addonId === FRAMEWORK_ADDON_ID) { return undefined; }

  const stored = core.guides.of(addonId);

  return isGuideManifest(stored) ? stored : undefined;
}

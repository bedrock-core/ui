/**
 * An addon's page in the shared addon list, as a reference.
 *
 * The page is a compiled screen baked into the addon's own pack, drawn into the list by every
 * client that holds the pack. What the realm drawing the list needs is small — per reserved
 * entry, the value it is shown with and where a press leads — and that is what an addon
 * announces under `core-addon/page`:
 *
 * ```ts
 * import { pages } from '@bedrock-core/navigation';
 * import { addonPageReference } from '@bedrock-core/config/compiled';
 * import AddonPage from './screens/addon.screen';
 *
 * pages(core).provide(addonPageReference(AddonPage));
 * ```
 *
 * The page follows from the manifest, so an addon's build compiles one and `ui()` announces it;
 * declaring is all it takes.
 *
 * The announcement carries the envelope only; `@bedrock-core/config` owns the real shape and
 * narrows it at the point of use.
 */
import { Announcement, isRecord, type Runtime } from '@bedrock-core/server-runtime';
import type { State } from '@bedrock-core/sync';

/** The envelope a page reference travels in. The renderer owns the real shape. */
export interface AddonPageReference {
  v: 1;
  /** Per reserved entry, the value it is shown with. `string[]` to the renderer. */
  values: unknown;
  /** Per reserved entry, where a press leads. To the renderer. */
  targets: unknown;
}

/** The envelope check {@link PagesRegistry} reads through. */
export function isAddonPageReference(value: unknown): value is AddonPageReference {
  return isRecord(value) && 'values' in value && 'targets' in value;
}

/** Each addon's page in the shared list, announced. */
export class PagesRegistry extends Announcement<AddonPageReference> {
  constructor(state: State, addonId: string) {
    super(state, addonId, 'addon/page', isAddonPageReference);
  }
}

const registries = new WeakMap<Runtime, PagesRegistry>();

/**
 * The page references on a runtime: `pages(core).provide(...)` to publish this addon's,
 * `pages(core).of(addonId)` for what another addon published.
 *
 * One registry per runtime, created on the first call and kept, so every caller in a realm
 * reads and writes the same feed.
 */
export function pages(core: Runtime): PagesRegistry {
  const found = registries.get(core);

  if (found !== undefined) {
    return found;
  }

  const registry = new PagesRegistry(core.node.state, core.id);

  registries.set(core, registry);

  return registry;
}

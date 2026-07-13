import type { Runtime, GuideManifest } from '@bedrock-core/server-runtime';
import type { GuideSource, GuideEntry } from '@bedrock-core/guides';

/**
 * Cross-addon {@link GuideSource} backed by the runtime's synced guides registry.
 * Guide manifests replicate over sync, so the first-wins host can list and render
 * every addon's guide locally.
 */
export function createConfigUiGuideSource(core: Runtime): GuideSource {
  return {
    list: (): GuideEntry[] =>
      core.guides.addonsWithGuides()
        .map((addonId): GuideEntry | undefined => {
          const manifest = core.guides.of(addonId);

          return manifest ? { addonId, manifest } : undefined;
        })
        .filter((e): e is GuideEntry => e !== undefined),
    get: (addonId?: string): GuideManifest | undefined =>
      addonId === undefined ? undefined : core.guides.of(addonId),
  };
}

import type { GuideManifest, GuidePageData, PageId } from './types';

/** One addon's guide, as listed by a {@link GuideSource}. */
export interface GuideEntry {
  /** Owning addon — undefined for a single local guide. */
  addonId?: string;
  manifest: GuideManifest;
}

/**
 * Where guide data comes from. Phase 1 uses {@link staticGuideSource} (the
 * build-time manifest imported from `@bedrock-core/generated/guides`);
 * Phase 2 adapters resolve other addons' guides over the cross-addon
 * transport, fetching page bodies lazily via {@link GuideSource.getPage}.
 */
export interface GuideSource {
  list(): GuideEntry[];
  get(addonId?: string): GuideManifest | undefined;
  /**
   * Optional async page fetch. When present, the page screen calls this
   * instead of reading `manifest.pages` and shows a loading state while the
   * promise settles — remote manifests may ship without page bodies.
   */
  getPage?(addonId: string | undefined, pageId: PageId): GuidePageData | Promise<GuidePageData | undefined> | undefined;
}

/** Wrap a locally imported manifest as a {@link GuideSource}. */
export function staticGuideSource(manifest: GuideManifest): GuideSource {
  const entry: GuideEntry = { manifest };

  return {
    list: () => [entry],
    get: () => manifest,
  };
}

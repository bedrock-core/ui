import { canSee, visiblePageIds } from './access';
import type { GuideAudience, GuideManifest, PageId } from './types';

/**
 * Where a guide opens: the `home` page it declares, or — with a single page, and
 * so no index worth showing — that page. Undefined means the index itself.
 */
export function resolveLanding(manifest: GuideManifest, audience: GuideAudience = 'op'): { landing: PageId | undefined; hasSidebar: boolean } {
  const pageIds = visiblePageIds(manifest, audience);
  const hasSidebar = pageIds.length > 1;
  const home = manifest.home;
  const declaredHome = home !== undefined && manifest.pages[home] !== undefined && canSee(manifest.pages[home].a, audience)
    ? home
    : undefined;

  return { landing: declaredHome ?? (hasSidebar ? undefined : pageIds[0]), hasSidebar };
}

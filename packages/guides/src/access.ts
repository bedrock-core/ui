/**
 * What one audience can reach in a guide.
 *
 * The manifest is compiled for the widest audience and carries the *effective* access on each
 * node (`a`), so everything here is a filter over one shared document rather than a second
 * build of it — a guide is replicated once and rendered per viewer.
 *
 * Read this as presentation, not protection. A manifest travels to every addon in the world
 * and its prose ships in the resource pack's `.lang`, so gating decides what a player is
 * *shown*, the way `hidden` does. Config authorization (`isOperator` on the host side) is what
 * decides what a player may *do*.
 */
import type { GuideAccess, GuideAudience, GuideManifest, GuidePageData, GuideTreeNode, PageId } from './types';

/** Whether `audience` may see a node carrying `access`. Ungated content is for everyone. */
export function canSee(access: GuideAccess | undefined, audience: GuideAudience): boolean {
  return access === undefined || audience === 'op';
}

/** The page ids this audience may open, in manifest order. */
export function visiblePageIds(manifest: GuideManifest, audience: GuideAudience): PageId[] {
  if (manifest.gated !== true || audience === 'op') { return Object.keys(manifest.pages); }

  return Object.keys(manifest.pages).filter(id => canSee(manifest.pages[id]?.a, audience));
}

/**
 * Whether this audience has anything to read at all. A guide that is entirely gated is not a
 * guide with an empty index for everyone else — the host should offer no way in.
 */
export function hasVisiblePages(manifest: GuideManifest, audience: GuideAudience): boolean {
  if (manifest.gated !== true || audience === 'op') { return Object.keys(manifest.pages).length > 0; }

  return Object.keys(manifest.pages).some(id => canSee(manifest.pages[id]?.a, audience));
}

/**
 * The sidebar as this audience sees it.
 *
 * A gated category is dropped whole — its children inherited the gate at build time, so
 * descending could only drop them one by one. A category that empties out goes with them,
 * unless it has a `link` page this audience can still reach, since that is a destination
 * rather than a heading over nothing.
 *
 * The manifest's own array is returned untouched when there is nothing to filter, so an
 * ungated guide allocates nothing and renders exactly as it did before access existed.
 */
export function visibleTree(manifest: GuideManifest, audience: GuideAudience): GuideTreeNode[] {
  if (manifest.gated !== true || audience === 'op') { return manifest.tree; }

  const prune = (nodes: GuideTreeNode[]): GuideTreeNode[] => {
    const kept: GuideTreeNode[] = [];

    for (const node of nodes) {
      if (!canSee(node.a, audience)) { continue; }

      if (node.t === 'page') {
        kept.push(node);
        continue;
      }

      const children = prune(node.children);
      const link = node.link !== undefined && canSee(manifest.pages[node.link]?.a, audience) ? node.link : undefined;

      if (children.length === 0 && link === undefined) { continue; }

      kept.push({ ...node, children, link });
    }

    return kept;
  };

  return prune(manifest.tree);
}

/** The prev/next pair for `page`, from the chain this audience reads. */
export function paginationFor(
  manifest: GuideManifest,
  page: GuidePageData | undefined,
  audience: GuideAudience,
): { prev: PageId | undefined; next: PageId | undefined } {
  if (!page) { return { prev: undefined, next: undefined }; }

  return manifest.gated === true && audience !== 'op'
    ? { prev: page.pprev, next: page.pnext }
    : { prev: page.prev, next: page.next };
}

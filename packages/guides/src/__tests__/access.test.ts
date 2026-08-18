import { describe, expect, it } from 'vitest';
import { resolveLanding } from '../createGuide';
import { hasVisiblePages, paginationFor, visiblePageIds, visibleTree } from '../access';
import type { GuideAccess, GuideManifest, GuidePageData, GuideTreeNode } from '../types';

/** `[id, access]` — a manifest whose pages and flat tree carry the given effective access. */
function manifestOf(entries: [string, GuideAccess?][], extra: Partial<GuideManifest> = {}): GuideManifest {
  const pages = Object.fromEntries(entries.map(([id, a]): [string, GuidePageData] => [
    id,
    { id, titleK: `bcg.demo.${id}.title`, blocks: [], ...(a === undefined ? {} : { a }) },
  ]));

  return {
    v: 1,
    ns: 'demo',
    defaultLocale: 'en_US',
    locales: ['en_US'],
    gated: entries.some(([, a]) => a !== undefined) ? true : undefined,
    tree: entries.map(([id, a]): GuideTreeNode => ({ t: 'page', id, titleK: `bcg.demo.${id}.title`, ...(a === undefined ? {} : { a }) })),
    pages,
    ...extra,
  } as GuideManifest;
}

describe('visibility', () => {
  const manifest = manifestOf([['intro'], ['ops', 'op'], ['faq']]);

  it('shows an operator everything and a player only what is ungated', () => {
    expect(visiblePageIds(manifest, 'op')).toEqual(['intro', 'ops', 'faq']);
    expect(visiblePageIds(manifest, 'player')).toEqual(['intro', 'faq']);
  });

  it('reports an entirely gated guide as having nothing for a player to read', () => {
    const allGated = manifestOf([['ops', 'op'], ['keys', 'op']]);

    expect(hasVisiblePages(allGated, 'op')).toBe(true);
    expect(hasVisiblePages(allGated, 'player')).toBe(false);
    expect(hasVisiblePages(manifest, 'player')).toBe(true);
  });

  it('returns the manifest tree untouched when nothing is gated', () => {
    const open = manifestOf([['intro'], ['faq']]);

    expect(visibleTree(open, 'player')).toBe(open.tree);
  });
});

describe('visibleTree', () => {
  const nested = (children: GuideTreeNode[], a?: GuideAccess, link?: string): GuideManifest => manifestOf(
    [['intro'], ['admin/tools', 'op'], ['admin/faq']],
    { tree: [
      { t: 'page', id: 'intro', titleK: 'bcg.demo.intro.title' },
      { t: 'cat', id: 'admin', labelK: 'bcg.demo._cat.admin', children, ...(a === undefined ? {} : { a }), ...(link === undefined ? {} : { link }) },
    ] },
  );

  const tools: GuideTreeNode = { t: 'page', id: 'admin/tools', titleK: 'bcg.demo.admin_tools.title', a: 'op' };
  const faq: GuideTreeNode = { t: 'page', id: 'admin/faq', titleK: 'bcg.demo.admin_faq.title' };

  it('drops a gated category whole, without descending into it', () => {
    const tree = visibleTree(nested([tools, faq], 'op'), 'player');

    expect(tree.map(n => n.id)).toEqual(['intro']);
  });

  it('keeps an open category, minus the children this audience cannot see', () => {
    const tree = visibleTree(nested([tools, faq]), 'player');
    const cat = tree.find(n => n.t === 'cat');

    expect(cat?.t === 'cat' && cat.children.map(n => n.id)).toEqual(['admin/faq']);
  });

  it('drops a category that empties out, and one whose only link is gated', () => {
    expect(visibleTree(nested([tools]), 'player').map(n => n.id)).toEqual(['intro']);
    expect(visibleTree(nested([], undefined, 'admin/tools'), 'player').map(n => n.id)).toEqual(['intro']);
  });

  it('keeps an empty category that still links somewhere reachable', () => {
    expect(visibleTree(nested([], undefined, 'admin/faq'), 'player').map(n => n.id)).toEqual(['intro', 'admin']);
  });
});

describe('paginationFor', () => {
  const manifest = manifestOf([['intro'], ['ops', 'op'], ['faq']]);

  manifest.pages['intro'] = { ...manifest.pages['intro'], next: 'ops', pnext: 'faq' };
  manifest.pages['faq'] = { ...manifest.pages['faq'], prev: 'ops', pprev: 'intro' };

  it('follows the full chain for an operator and the public one for a player', () => {
    expect(paginationFor(manifest, manifest.pages['intro'], 'op')).toEqual({ prev: undefined, next: 'ops' });
    expect(paginationFor(manifest, manifest.pages['intro'], 'player')).toEqual({ prev: undefined, next: 'faq' });
    expect(paginationFor(manifest, manifest.pages['faq'], 'player')).toEqual({ prev: 'intro', next: undefined });
  });

  it('reads the only chain there is when nothing is gated', () => {
    const open = manifestOf([['intro'], ['faq']]);

    open.pages['intro'] = { ...open.pages['intro'], next: 'faq' };

    expect(paginationFor(open, open.pages['intro'], 'player')).toEqual({ prev: undefined, next: 'faq' });
  });
});

describe('resolveLanding per audience', () => {
  it('drops the sidebar for a player left with one page, keeping it for the operator', () => {
    const manifest = manifestOf([['intro'], ['ops', 'op']]);

    expect(resolveLanding(manifest, 'op')).toEqual({ landing: undefined, hasSidebar: true });
    expect(resolveLanding(manifest, 'player')).toEqual({ landing: 'intro', hasSidebar: false });
  });

  it('falls back to the index when the declared home is gated', () => {
    const manifest = manifestOf([['landing', 'op'], ['intro'], ['faq']], { home: 'landing' });

    expect(resolveLanding(manifest, 'op')).toEqual({ landing: 'landing', hasSidebar: true });
    expect(resolveLanding(manifest, 'player')).toEqual({ landing: undefined, hasSidebar: true });
  });

  it('leaves a player with nothing to open when every page is gated', () => {
    const manifest = manifestOf([['ops', 'op'], ['keys', 'op']]);

    expect(resolveLanding(manifest, 'player')).toEqual({ landing: undefined, hasSidebar: false });
  });

  it('defaults to the operator view, so a host that knows nothing about access sees it all', () => {
    const manifest = manifestOf([['intro'], ['ops', 'op']]);

    expect(resolveLanding(manifest)).toEqual(resolveLanding(manifest, 'op'));
  });
});

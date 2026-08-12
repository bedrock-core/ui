import { describe, expect, it } from 'vitest';
import { createGuide, resolveLanding } from '../createGuide';
import type { GuideManifest, GuidePageData } from '../types';

function page(id: string): GuidePageData {
  return { id, titleK: `bcg.demo.${id}.title`, blocks: [{ t: 'p', runs: [{ k: `bcg.demo.${id}.b0.r0` }] }] };
}

function manifestOf(ids: string[], home?: string): GuideManifest {
  return {
    v: 1,
    ns: 'demo',
    defaultLocale: 'en_US',
    locales: ['en_US'],
    tree: ids.map(id => ({ t: 'page', id, titleK: `bcg.demo.${id}.title` })),
    pages: Object.fromEntries(ids.map(id => [id, page(id)])),
    ...(home === undefined ? {} : { home }),
  };
}

const manifest = manifestOf(['intro']);

describe('createGuide', () => {
  it('returns a component bound to the manifest', () => {
    const Guide = createGuide(manifest, { title: 'Demo' });

    expect(typeof Guide).toBe('function');
  });

  it('returns a distinct component per call (so each can hold its own page state)', () => {
    expect(createGuide(manifest)).not.toBe(createGuide(manifest));
  });
});

describe('resolveLanding', () => {
  it('opens the sidebar when there is a choice of pages', () => {
    expect(resolveLanding(manifestOf(['intro', 'usage']))).toEqual({ landing: undefined, hasSidebar: true });
  });

  it('drops the sidebar for a single-page guide and opens that page', () => {
    expect(resolveLanding(manifestOf(['intro']))).toEqual({ landing: 'intro', hasSidebar: false });
  });

  it('opens the declared home instead of the sidebar, keeping the sidebar reachable', () => {
    expect(resolveLanding(manifestOf(['intro', 'usage'], 'usage'))).toEqual({ landing: 'usage', hasSidebar: true });
  });

  it('ignores a home that names no page, rather than opening a missing one', () => {
    expect(resolveLanding(manifestOf(['intro', 'usage'], 'gone'))).toEqual({ landing: undefined, hasSidebar: true });
  });

  it('has nothing to open when the manifest has no pages', () => {
    expect(resolveLanding(manifestOf([]))).toEqual({ landing: undefined, hasSidebar: false });
  });
});

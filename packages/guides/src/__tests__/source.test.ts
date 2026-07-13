import { describe, expect, it } from 'vitest';
import { createGuideScreens } from '../createGuideScreens';
import { staticGuideSource } from '../source';
import type { GuideManifest } from '../types';

const manifest: GuideManifest = {
  v: 1,
  ns: 'demo',
  defaultLocale: 'en_US',
  locales: ['en_US'],
  tree: [{ t: 'page', id: 'intro', titleK: 'bcg.demo.intro.title' }],
  pages: {
    intro: { id: 'intro', titleK: 'bcg.demo.intro.title', blocks: [{ t: 'p', runs: [{ k: 'bcg.demo.intro.b0.r0' }] }] },
  },
};

describe('staticGuideSource', () => {
  it('serves the wrapped manifest regardless of addonId', () => {
    const source = staticGuideSource(manifest);

    expect(source.get()).toBe(manifest);
    expect(source.get('any:addon')).toBe(manifest);
    expect(source.list()).toEqual([{ manifest }]);
    expect(source.getPage).toBeUndefined();
  });
});

describe('createGuideScreens', () => {
  it('returns both screen components', () => {
    const screens = createGuideScreens(staticGuideSource(manifest));

    expect(typeof screens.GuideContents).toBe('function');
    expect(typeof screens.GuidePage).toBe('function');
  });
});

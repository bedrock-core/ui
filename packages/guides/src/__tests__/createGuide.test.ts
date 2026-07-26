import { describe, expect, it } from 'vitest';
import { createGuide } from '../createGuide';
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

describe('createGuide', () => {
  it('returns a component bound to the manifest', () => {
    const Guide = createGuide(manifest, { title: 'Demo' });

    expect(typeof Guide).toBe('function');
  });

  it('returns a distinct component per call (so each can hold its own page state)', () => {
    expect(createGuide(manifest)).not.toBe(createGuide(manifest));
  });
});

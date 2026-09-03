import { registerCompiledScreen } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { guideHomeScreen, guidePageScreen, guideReference } from '../compiled';
import type { GuideManifest } from '../types';

// The reference is read off the compiled screens themselves: each screen is
// built the way the compile built it, its entries listed, and every press
// probed for where it leads — so the table can never disagree with the bake.

const manifest: GuideManifest = {
  v: 1,
  ns: 'ref',
  defaultLocale: 'en_US',
  locales: ['en_US'],
  tree: [
    { t: 'page', id: 'intro', titleK: 'ref.intro.title' },
    { t: 'page', id: 'usage', titleK: 'ref.usage.title' },
  ],
  pages: {
    intro: { id: 'intro', titleK: 'ref.intro.title', next: 'usage', blocks: [{ t: 'p', runs: [{ k: 'ref.intro.b0.r0' }, { k: 'ref.intro.b0.r1', to: 'usage' }] }] },
    usage: { id: 'usage', titleK: 'ref.usage.title', prev: 'intro', blocks: [{ t: 'p', runs: [{ k: 'ref.usage.b0.r0' }] }] },
  },
};

const Home = guideHomeScreen(manifest);
const Intro = guidePageScreen(manifest, 'intro');
const Usage = guidePageScreen(manifest, 'usage');

registerCompiledScreen(Home, 'core1:ref_home');
registerCompiledScreen(Intro, 'core1:ref_intro');
registerCompiledScreen(Usage, 'core1:ref_usage');

describe('guideReference', () => {
  const reference = guideReference('ref');

  it('names every screen by its compiled title and lands on the index', () => {
    expect(reference?.landing).toBeUndefined();
    expect(reference?.home?.title).toBe('core1:ref_home');
    expect(reference?.pages.intro?.title).toBe('core1:ref_intro');
    expect(reference?.pages.usage?.title).toBe('core1:ref_usage');
  });

  it('follows the index rows to their pages', () => {
    expect(reference?.home?.targets).toEqual([{ page: 'intro' }, { page: 'usage' }]);
    expect(reference?.home?.values).toEqual(['1', '1']);
  });

  it('follows a page\'s back, links and footer', () => {
    // Header back, the inline link, the footer's index button, then next.
    expect(reference?.pages.intro?.targets).toEqual([{ home: true }, { page: 'usage' }, { home: true }, { page: 'usage' }]);
    // Header back, the footer's prev, then the index button.
    expect(reference?.pages.usage?.targets).toEqual([{ home: true }, { page: 'intro' }, { home: true }]);
  });

  it('is undefined for a guide this bundle never registered', () => {
    expect(guideReference('nowhere')).toBeUndefined();
  });
});

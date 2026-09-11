import { addonReference, registerCompiledScreen } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { guideHomeBackScreen, guideHomeScreen, guidePageScreen } from '../compiled';
import type { GuideManifest } from '../types';

// A guide's screens are navigated by link, so the reference is read straight off
// the built tree: each entry's target is the key its `<Link>` carries. The way
// out takes no entry — the client closes the form, and a walk ends with it.

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
const HomeBack = guideHomeBackScreen(manifest);
const Intro = guidePageScreen(manifest, 'intro');
const Usage = guidePageScreen(manifest, 'usage');

registerCompiledScreen(Home, { key: 'ref:guide_home', title: 'core1:ref_guide_home' });
registerCompiledScreen(HomeBack, { key: 'ref:guide_home_back', title: 'core1:ref_guide_home_back' });
registerCompiledScreen(Intro, { key: 'ref:guide_intro', title: 'core1:ref_guide_intro' });
registerCompiledScreen(Usage, { key: 'ref:guide_usage', title: 'core1:ref_guide_usage' });

describe('a compiled guide as a reference', () => {
  const reference = addonReference('ref');

  it('names every screen by its compiled title', () => {
    expect(reference.screens['ref:guide_home']?.title).toBe('core1:ref_guide_home');
    expect(reference.screens['ref:guide_intro']?.title).toBe('core1:ref_guide_intro');
  });

  it('sends the index rows to the page screens, with the addon half filled in', () => {
    const home = reference.screens['ref:guide_home'];

    expect(home?.targets).toContainEqual({ to: 'ref:guide_intro' });
    expect(home?.targets).toContainEqual({ to: 'ref:guide_usage' });
  });

  it('follows a link written in the prose', () => {
    const intro = reference.screens['ref:guide_intro'];

    expect(intro?.targets).toContainEqual({ to: 'ref:guide_usage' });
  });

  it('marks the back control of the index a host opened', () => {
    const back = reference.screens['ref:guide_home_back'];
    const home = reference.screens['ref:guide_home'];

    // The back is an entry of its own, which is what tells a host that the player
    // asked to go back rather than closing the form; the plain index has none.
    expect(back?.targets).toContainEqual({ back: true });
    expect(home?.targets).not.toContainEqual({ back: true });
  });

  it('sends a page back to the index', () => {
    const intro = reference.screens['ref:guide_intro'];

    expect(intro?.targets).toContainEqual({ to: 'ref:guide_home' });
  });
});

import { analyze, allocateForm, buildScreenTree, linkTarget, visiblesAt } from '@bedrock-core/ui-runtime/compile';
import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { guideHomeBackScreen, guideHomeScreen, guidePageScreen } from '../compiled';
import type { GuideManifest } from '../types';

// A guide's screens are navigated by link, and the build reads where each press
// leads straight off the tree — the same walk, over the same entries, that the
// compile runs. No press inside a guide is a handler: that is what lets a page
// ship as a table instead of as a component.

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

/** Where each of a screen's entries leads, as the build reads it. */
const targetsOf = (screen: FunctionComponent): (ReturnType<typeof linkTarget>)[] => {
  const tree = buildScreenTree(screen);
  const { entries } = allocateForm(tree, analyze(tree, visiblesAt(tree, [])));

  return entries.map(entry => linkTarget(entry.element));
};

describe('a compiled guide is presses that are links', () => {
  it('sends the index rows to the page screens', () => {
    expect(targetsOf(guideHomeScreen(manifest))).toEqual(
      expect.arrayContaining([{ to: 'guide_intro' }, { to: 'guide_usage' }]),
    );
  });

  it('follows a link written in the prose in place, and takes a page back to its index', () => {
    const targets = targetsOf(guidePageScreen(manifest, 'intro'));

    // A page replaces the page it links from, so the index the reader opened —
    // the plain one or the one a host opened — stays the screen under whichever
    // page is showing: the header's back and the footer's index button both
    // return there, and nothing names an index.
    expect(targets).toEqual(expect.arrayContaining([
      { back: true },
      { to: 'guide_usage', replace: true },
    ]));
    expect(targets.filter(target => target !== undefined && 'to' in target && target.replace !== true)).toEqual([]);
    expect(targets.filter(target => target !== undefined && 'back' in target)).toHaveLength(2);
  });

  it('marks the back control of the index a host opened', () => {
    expect(targetsOf(guideHomeBackScreen(manifest))).toEqual(expect.arrayContaining([{ back: true }]));
    expect(targetsOf(guideHomeScreen(manifest))).not.toEqual(expect.arrayContaining([{ back: true }]));
  });

  it('leaves no entry to a handler: every press is describable', () => {
    for (const screen of [guideHomeScreen(manifest), guideHomeBackScreen(manifest), guidePageScreen(manifest, 'usage')]) {
      expect(targetsOf(screen).every(target => target !== undefined)).toBe(true);
    }
  });
});

/** @jsxImportSource @bedrock-core/ui-runtime */
import { render, useExit, type FunctionComponent, type JSX, type PressEvent } from '@bedrock-core/ui-runtime';
import { resolveLanding } from './createGuide';
import type { GuideComponents, GuideManifest, PageId } from './types';
import { GuideHomeView } from './views/GuideHome';
import { GuidePageView } from './views/GuidePage';

/**
 * A guide as compiled screens: one per page and one for the home index, each
 * a component of its own that the build bakes into the pack the way it bakes
 * any `*.screen.tsx`. The guides filter writes the module that calls these
 * factories; nothing here is meant to be written by hand.
 *
 * Navigation is a `render()` of another screen for the pressing player —
 * a page is a screen, not a state of one, so there is no open-page state to
 * carry and the shape of every screen is fixed at build. What that changes
 * against `createGuide`:
 *
 * - The home index folds its categories on the client (`<Disclosure>`): the
 *   header is a toggle the rows read, and nothing reaches script for a fold.
 * - Every screen is compiled for the widest audience. Access gating is per
 *   viewer, which a frozen shape cannot express yet, so a gated guide keeps
 *   rendering through `createGuide` until the gate rides a carried visible.
 */
export interface CompiledGuideOptions {
  /** Header title (raw text, colorable). Defaults to `'Guide'`. */
  title?: string;
  /**
   * The canvas every screen of the guide is baked at, centred on the form.
   * Defaults to 300×200 — inside the 320×210 the smallest UI scale draws,
   * so a page fits every screen without a host telling it its box.
   */
  width?: number;
  height?: number;
  /** Component registry for MDX `cmp` blocks. */
  components?: GuideComponents;
}

const CANVAS = { width: 300, height: 200 };

interface GuideScreens {
  home?: FunctionComponent;
  pages: Map<PageId, FunctionComponent>;
  landing: PageId | undefined;
  hasSidebar: boolean;
}

/** Every compiled guide this bundle registered, by manifest namespace. */
const guides = new Map<string, GuideScreens>();

const screensOf = (manifest: GuideManifest): GuideScreens => {
  const existing = guides.get(manifest.ns);

  if (existing !== undefined) {
    return existing;
  }

  const created: GuideScreens = { pages: new Map(), ...resolveLanding(manifest, 'op') };

  guides.set(manifest.ns, created);

  return created;
};

/** Guides opened with `debug`, so every page they open is diffed too. */
const debugging = new Set<string>();

/** Shows `page` of guide `ns` (the home index when undefined) to `player`. */
const open = (ns: string, page: PageId | undefined, player: PressEvent['player']): boolean => {
  const screens = guides.get(ns);
  const screen = page === undefined ? screens?.home : screens?.pages.get(page);

  if (screen === undefined) {
    // Name the miss: a link to a page that did not compile, or a guide this
    // bundle never registered — the build warns about the first at compile
    // time, the second is an addon opening another addon's guide by hand.
    console.warn(`[guides] no compiled screen for ${page === undefined ? 'the home index' : `page "${page}"`} of guide "${ns}"`);

    return false;
  }

  render(screen, player, { debug: debugging.has(ns) });

  return true;
};

/** The home index of `manifest` as a compiled screen. */
export function guideHomeScreen(manifest: GuideManifest, options: CompiledGuideOptions = {}): FunctionComponent {
  const screens = screensOf(manifest);
  const title = options.title ?? 'Guide';

  const GuideHome = (): JSX.Element => {
    const close = useExit();

    return (
      <GuideHomeView
        tree={manifest.tree}
        title={title}
        width={options.width ?? CANVAS.width}
        height={options.height ?? CANVAS.height}
        folding={'client'}
        onOpenPage={(id, event): void => { open(manifest.ns, id, event.player); }}
        onClose={close}
      />
    );
  };

  screens.home = GuideHome;

  return GuideHome;
}

/** Page `pageId` of `manifest` as a compiled screen. */
export function guidePageScreen(manifest: GuideManifest, pageId: PageId, options: CompiledGuideOptions = {}): FunctionComponent {
  const screens = screensOf(manifest);
  const title = options.title ?? 'Guide';
  const toHome = screens.hasSidebar
    ? (event: PressEvent): void => { open(manifest.ns, undefined, event.player); }
    : undefined;

  const GuidePage = (): JSX.Element => {
    const close = useExit();

    return (
      <GuidePageView
        manifest={manifest}
        tree={manifest.tree}
        audience={'op'}
        pageId={pageId}
        title={title}
        width={options.width ?? CANVAS.width}
        height={options.height ?? CANVAS.height}
        components={options.components}
        onOpenPage={(id, event): void => { open(manifest.ns, id, event.player); }}
        onBack={toHome}
        onHome={toHome}
        onClose={close}
      />
    );
  };

  screens.pages.set(pageId, GuidePage);

  return GuidePage;
}

/**
 * Opens guide `ns` where it lands — its home page when it declares one, the
 * index when there is more than one page, the page itself otherwise. False
 * when no compiled guide by that namespace was registered in this bundle.
 */
export function openGuide(ns: string, player: PressEvent['player'], options: { debug?: boolean } = {}): boolean {
  const screens = guides.get(ns);

  if (screens === undefined) {
    console.warn(`[guides] no compiled guide "${ns}" — was its generated screens module bundled?`);

    return false;
  }

  // `render(..., { debug })` diffs one present against its bake; a guide is a
  // chain of presents, so the flag follows every page opened from this one.
  if (options.debug === true) {
    debugging.add(ns);
  } else {
    debugging.delete(ns);
  }

  return open(ns, screens.landing, player);
}

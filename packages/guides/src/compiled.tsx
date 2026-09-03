/** @jsxImportSource @bedrock-core/ui-runtime */
import {
  compiledSnapshotOf, compiledTitleOf, compiledValuesOf, render, showCompiledTitle, useExit,
  type FunctionComponent, type JSX, type PressEvent,
} from '@bedrock-core/ui-runtime';
import { buildScreenTree } from '@bedrock-core/ui-runtime/compile';
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

/**
 * Stands in for a player while a screen's presses are PROBED for where they
 * lead: a handler called with it records its target instead of opening it.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- a sentinel compared by identity; no Player method is ever called on it
const PROBE = { id: 'guide-probe' } as unknown as PressEvent['player'];

/** What the probed press asked to open, read back by `guideReference`. */
let probed: GuideTarget | null = null;

/** Shows `page` of guide `ns` (the home index when undefined) to `player`. */
const open = (ns: string, page: PageId | undefined, player: PressEvent['player']): boolean => {
  if (player === PROBE) {
    probed = page === undefined ? { home: true } : { page };

    return true;
  }

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

// ─── The reference: a guide as another realm can show it ──────────────────────

/** Where a press leads: a page, the home index, or nowhere the guide knows. */
export type GuideTarget = { page: PageId } | { home: true };

/** One compiled screen as a title and the entries it is shown with. */
export interface GuideScreenReference {
  /** The compiled title the client picks the layout by. */
  title: string;
  /** The value each entry is shown with, in `selection` order. */
  values: string[];
  /** Where each `selection` leads; null where a press leads nowhere. */
  targets: (GuideTarget | null)[];
}

/**
 * A compiled guide, reduced to what presenting it needs and nothing of what
 * it says: the prose lives in the pack every client already has. This is
 * what replicates across addons — the elected realm shows any addon's guide
 * from it with plain native forms, none of the owner's script involved.
 */
export interface GuideReference {
  v: 1;
  ns: string;
  /** The page the guide opens on; the home index when absent. */
  landing?: PageId;
  home?: GuideScreenReference;
  pages: Record<PageId, GuideScreenReference>;
}

/**
 * One screen's reference: built once the way the compile built it, its
 * entries read off the tree, and every press probed for where it leads.
 */
const referenceOf = (screen: FunctionComponent): GuideScreenReference | undefined => {
  const title = compiledTitleOf(screen);

  if (title === undefined) {
    return undefined;
  }

  const { entries, values } = compiledValuesOf(buildScreenTree(screen), compiledSnapshotOf(screen));
  const targets = entries.map((entry): GuideTarget | null => {
    const { onPress } = entry.element.props;

    probed = null;

    if (typeof onPress === 'function') {
      // A guide's handlers are synchronous and only ever call `open`; the
      // probe player makes that a recording instead of a present.
      Reflect.apply(onPress, undefined, [{ player: PROBE }]);
    }

    return probed;
  });

  return { title, values, targets };
};

/**
 * The reference of guide `ns`, or undefined when this bundle registered no
 * compiled guide by that namespace. Built on demand from the registered
 * screens — publish it once at startup, the way the manifest was.
 */
export function guideReference(ns: string): GuideReference | undefined {
  const screens = guides.get(ns);

  if (screens === undefined) {
    return undefined;
  }

  const home = screens.home === undefined ? undefined : referenceOf(screens.home);
  const pages: Record<PageId, GuideScreenReference> = {};

  for (const [pageId, screen] of screens.pages) {
    const reference = referenceOf(screen);

    if (reference !== undefined) {
      pages[pageId] = reference;
    }
  }

  return {
    v: 1,
    ns,
    ...screens.landing === undefined ? {} : { landing: screens.landing },
    ...home === undefined ? {} : { home },
    pages,
  };
}

/**
 * Shows a guide from its reference: each screen by its title with its baked
 * values, each press followed to the next, until a press leads nowhere or
 * the player dismisses the form. Any realm can call this for any addon's
 * guide — the client draws the layouts from the pack it already has.
 */
export async function presentGuideReference(reference: GuideReference, player: PressEvent['player']): Promise<void> {
  let screen = reference.landing === undefined ? reference.home : reference.pages[reference.landing];

  while (screen !== undefined) {
    const selection = await showCompiledTitle(player, screen.title, screen.values);
    const target = selection === undefined ? null : screen.targets[selection] ?? null;

    screen = target === null
      ? undefined
      : 'home' in target ? reference.home : reference.pages[target.page];
  }
}

/** @jsxImportSource @bedrock-core/ui-runtime */
import { useExit, useState, type JSX } from '@bedrock-core/ui-runtime';
import { canSee, visiblePageIds, visibleTree } from './access';
import type { GuideAudience, GuideComponents, GuideManifest, PageId } from './types';
import { GuideHomeView } from './views/GuideHome';
import { GuidePageView } from './views/GuidePage';

export interface GuideOptions {
  /** Header title (raw text, colorable). Defaults to `'Guide'`. */
  title?: string;
  /** Component registry for MDX `cmp` blocks (`<ItemRenderer … />` in a guide). */
  components?: GuideComponents;

  /**
   * Who this instance is rendered for. `'player'` drops every page and category the manifest
   * gated with `access: op`; the default `'op'` shows the whole guide, so a host that knows
   * nothing about access keeps the behaviour it had.
   *
   * Fixed at build time, like the landing page it decides — so a host caching guide components
   * must key that cache by audience as well as by addon, or the first operator to open a guide
   * hands their copy of it to the next player who does.
   */
  audience?: GuideAudience;
}

export interface GuideProps {
  /**
   * Leave the guide from its home screen — wire it to the host's
   * `navigation.goBack()`. Omitted for a root guide (no back button on home).
   */
  onExit?: () => void;
}

/**
 * Build a self-contained guide component for one manifest. It owns its
 * home ⇆ page navigation internally (a page is not a host route), so a host
 * only needs a single screen that renders it:
 *
 * ```tsx
 * const Guide = createGuide(manifest, { title: 'Shop' });
 * // in a host screen:
 * <Guide onExit={() => navigation.goBack()} />
 * ```
 *
 * Call it once per manifest (e.g. once per addon) and cache the result — the
 * returned component holds the open-page state, so recreating it on every
 * render would reset the guide to its home screen.
 */
/**
 * Where a guide opens, and whether its sidebar is worth having.
 *
 * A sidebar is a choice between pages, so it earns its screen only when there is more than one.
 * A single-page guide IS its page: opening on a table of contents with one row, and offering a
 * button back to it, would be two extra presses to reach the only thing there is.
 *
 * `manifest.home` overrides where the guide opens — useful when the sidebar is not the
 * introduction you would have written. An id no page matches is ignored rather than opening a
 * "page not found": a manifest is replicated data and may have been built against a newer
 * version of this package than the one rendering it.
 *
 * Everything above is decided over the pages THIS audience can see, which is the whole point of
 * resolving it per instance: a guide of one public page and three operator ones is a single-page
 * guide to a player and a sidebar to an operator, and a `home` an operator lands on falls back
 * to the index for everyone else rather than opening a page they were not meant to read.
 *
 * Exported for tests; `createGuide` is the public surface.
 */
export function resolveLanding(manifest: GuideManifest, audience: GuideAudience = 'op'): { landing: PageId | undefined; hasSidebar: boolean } {
  const pageIds = visiblePageIds(manifest, audience);
  const hasSidebar = pageIds.length > 1;
  const home = manifest.home;
  const declaredHome = home !== undefined && manifest.pages[home] !== undefined && canSee(manifest.pages[home].a, audience)
    ? home
    : undefined;

  return { landing: declaredHome ?? (hasSidebar ? undefined : pageIds[0]), hasSidebar };
}

export function createGuide(manifest: GuideManifest, options: GuideOptions = {}): (props: GuideProps) => JSX.Element {
  const title = options.title ?? 'Guide';
  const audience = options.audience ?? 'op';
  const { landing, hasSidebar } = resolveLanding(manifest, audience);
  // Pruned once per guide, not per render: the audience cannot change under a mounted guide.
  const tree = visibleTree(manifest, audience);

  return function Guide({ onExit }: GuideProps): JSX.Element {
    // `undefined` = the sidebar screen; a PageId = that page. The state is
    // STAMPED with the manifest's namespace: hook state lives in the fiber's
    // tree position, not in the component's identity, so when a different
    // guide renders at the same position (the config Guide screen swaps one
    // cached guide component per addon), it inherits this very slot. A stamp
    // from another manifest — or a page id a re-published manifest no longer
    // carries — resets to this guide's landing instead of rendering
    // "Page not found" for a page that was never this guide's to begin with.
    const [state, setState] = useState<{ ns: string; page: PageId | undefined }>({ ns: manifest.ns, page: landing });
    const close = useExit();

    // A page this audience cannot see is treated exactly like one the manifest no longer
    // carries — the reader lands where the guide opens, rather than on a refusal naming a page
    // that, as far as they are concerned, does not exist.
    const stateIsUsable = state.ns === manifest.ns
      && (state.page === undefined || (manifest.pages[state.page] !== undefined && canSee(manifest.pages[state.page].a, audience)));
    const pageId = stateIsUsable ? state.page : landing;

    const setPageId = (page: PageId | undefined): void => { setState({ ns: manifest.ns, page }); };

    if (pageId === undefined) {
      return (
        <GuideHomeView
          tree={tree}
          title={title}
          onOpenPage={(id): void => setPageId(id)}
          onExit={onExit}
          onClose={close}
        />
      );
    }

    return (
      <GuidePageView
        manifest={manifest}
        tree={tree}
        audience={audience}
        pageId={pageId}
        title={title}
        components={options.components}
        onOpenPage={(id): void => setPageId(id)}
        // Back goes to the sidebar when there is one; without it, out of the guide entirely —
        // the same gesture, one screen shorter. `onExit` may itself be absent for a root guide,
        // which hides the control. The footer index button is offered only when there is an
        // index to reach, so a single-page guide shows no button that merely repeats Back.
        onBack={hasSidebar ? (): void => setPageId(undefined) : onExit}
        onHome={hasSidebar ? (): void => setPageId(undefined) : undefined}
        onClose={close}
      />
    );
  };
}

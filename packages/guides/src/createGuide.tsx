/** @jsxImportSource @bedrock-core/ui-runtime */
import { useExit, useState, type JSX } from '@bedrock-core/ui-runtime';
import type { GuideComponents, GuideManifest, PageId } from './types';
import { GuideHomeView } from './views/GuideHome';
import { GuidePageView } from './views/GuidePage';

export interface GuideOptions {
  /** Header title (raw text, colorable). Defaults to `'Guide'`. */
  title?: string;
  /** Component registry for MDX `cmp` blocks (`<ItemRenderer … />` in a guide). */
  components?: GuideComponents;
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
 * Exported for tests; `createGuide` is the public surface.
 */
export function resolveLanding(manifest: GuideManifest): { landing: PageId | undefined; hasSidebar: boolean } {
  const pageIds = Object.keys(manifest.pages);
  const hasSidebar = pageIds.length > 1;
  const declaredHome = manifest.home !== undefined && manifest.pages[manifest.home] !== undefined
    ? manifest.home
    : undefined;

  return { landing: declaredHome ?? (hasSidebar ? undefined : pageIds[0]), hasSidebar };
}

export function createGuide(manifest: GuideManifest, options: GuideOptions = {}): (props: GuideProps) => JSX.Element {
  const title = options.title ?? 'Guide';
  const { landing, hasSidebar } = resolveLanding(manifest);

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

    const pageId = state.ns === manifest.ns && (state.page === undefined || manifest.pages[state.page] !== undefined)
      ? state.page
      : landing;

    const setPageId = (page: PageId | undefined): void => { setState({ ns: manifest.ns, page }); };

    if (pageId === undefined) {
      return (
        <GuideHomeView
          manifest={manifest}
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

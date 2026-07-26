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
export function createGuide(manifest: GuideManifest, options: GuideOptions = {}): (props: GuideProps) => JSX.Element {
  const title = options.title ?? 'Guide';

  return function Guide({ onExit }: GuideProps): JSX.Element {
    // `undefined` = the home (table-of-contents) screen; a PageId = that page.
    const [pageId, setPageId] = useState<PageId | undefined>(undefined);
    const close = useExit();

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
        onHome={(): void => setPageId(undefined)}
        onClose={close}
      />
    );
  };
}

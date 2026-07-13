import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import type { PageId } from '@bedrock-core/server-runtime';

/**
 * The guide IR (the manifest shape the `guides` Regolith filter emits) is owned by the server
 * framework — `@bedrock-core/server-runtime` types + stores + syncs it, like config. This UI
 * package re-exports those data types and adds only the rendering-specific ones below.
 */
export type {
  LangKey,
  PageId,
  AdmonitionKind,
  GuideRun,
  GuideListItem,
  GuideBlock,
  GuideTreeNode,
  GuidePageData,
  GuideManifest,
} from '@bedrock-core/server-runtime';

/**
 * Route map contributed by {@link createGuideScreens}. Merge into the host
 * app's routes: `type AppRoutes = { ... } & GuideRoutes`.
 */
export type GuideRoutes = {
  GuideContents: { addonId?: string } | undefined;
  GuidePage: { pageId: PageId; addonId?: string };
};

/**
 * Component registry for MDX `cmp` blocks (`<ItemRenderer … />` in a guide).
 * Unregistered names render an "unsupported content" placeholder.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry accepts heterogeneous component prop shapes; props are validated by the authoring filter, not here
export type GuideComponents = Record<string, FunctionComponent<any>>;

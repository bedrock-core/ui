import type { FunctionComponent } from '@bedrock-core/ui-runtime';

/**
 * Guide IR — the manifest shape emitted by the `guides` regolith filter
 * (`data/guides/guides.generated.json`, imported as `@bedrock-core/generated/guides`).
 *
 * These are the canonical type declarations; the filter ships a structural
 * copy in its generated `.d.ts` so it stays usable without this package.
 *
 * Field names are deliberately terse (`t`, `k`, `l`): manifests travel over
 * the cross-addon script-event transport in Phase 2, where payload size is a
 * real budget.
 */

/** Generated localization key, e.g. `bcg.my_addon.getting_started.intro.b3`. */
export type LangKey = string;

/** Extension-less POSIX path of a page, e.g. `getting-started/intro`. */
export type PageId = string;

export type AdmonitionKind = 'note' | 'tip' | 'info' | 'warning' | 'danger';

/**
 * One run of a paragraph/list-item's inline content, in document order.
 * A run with `to` is an internal link — rendered as its own pressable
 * element woven inline with the surrounding text (not a detached button
 * row) — everything else is plain (§-styled) prose.
 */
export interface GuideRun {
  k: LangKey;
  to?: PageId;
}

export interface GuideListItem {
  runs: GuideRun[];
  /** One nesting level renders indented; deeper levels flatten. */
  items?: GuideListItem[];
}

export type GuideBlock
  = | { t: 'h'; l: 1 | 2 | 3; k: LangKey }
    | { t: 'p'; runs: GuideRun[] }
    | { t: 'ul'; items: GuideListItem[] }
    | { t: 'ol'; items: GuideListItem[]; start?: number }
    | { t: 'img'; src: string; alt?: string; w?: number; h?: number }
    | { t: 'adm'; kind: AdmonitionKind; titleK?: LangKey; blocks: GuideBlock[] }
    | { t: 'code'; lang?: string; lines: string[] }
    | { t: 'hr' }
    | { t: 'cmp'; name: string; props?: Record<string, unknown>; blocks?: GuideBlock[] };

export type GuideTreeNode
  = | { t: 'page'; id: PageId; titleK: LangKey }
    | { t: 'cat'; id: string; labelK: LangKey; collapsed?: boolean; link?: PageId; children: GuideTreeNode[] };

export interface GuidePageData {
  id: PageId;
  titleK: LangKey;
  blocks: GuideBlock[];
  /** Previous page in sidebar DFS order (Docusaurus-style pagination). */
  prev?: PageId;
  /** Next page in sidebar DFS order. */
  next?: PageId;
}

export interface GuideManifest {
  /** IR format version. */
  v: 1;
  /** Addon namespace (the filter's `keyPrefix`, sanitized). */
  ns: string;
  defaultLocale: string;
  locales: string[];
  tree: GuideTreeNode[];
  pages: Record<PageId, GuidePageData>;
}

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

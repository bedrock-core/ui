/**
 * Guide IR — the manifest shape the `guides` Regolith filter emits
 * (`data/guides/guides.generated.json`, imported as `@bedrock-core/generated/guides`).
 *
 * This package owns the IR because it is the only code that interprets it. The server
 * framework stores and syncs manifests without ever reading inside one — its
 * `GuideManifest` is a two-field structural shape, and `@bedrock-core/server-runtime` is
 * deliberately not a dependency here, so a guide can be rendered without the framework.
 *
 * Field names are deliberately terse (`t`, `k`, `l`): manifests travel over the cross-addon
 * script-event transport, where payload size is a real budget.
 */
import type { FunctionComponent } from '@bedrock-core/ui-runtime';

/** Generated localization key, e.g. `bcg.my_addon.getting_started.intro.b3`. */
export type LangKey = string;

/** Extension-less POSIX path of a page, e.g. `getting-started/intro`. */
export type PageId = string;

export type AdmonitionKind = 'note' | 'tip' | 'info' | 'warning' | 'danger';

/**
 * One run of a paragraph/list-item's inline content, in document order. A run with `to` is an
 * internal link — rendered as its own pressable element woven inline with the surrounding
 * text — everything else is plain (§-styled) prose.
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

/**
 * A sidebar entry. `icon` is a resource-pack texture path (e.g. `textures/ui/…`) shown as the
 * row/section thumbnail; `descK` (pages only) is a one-line subtitle localization key. Both are
 * optional — a bare `titleK`/`labelK` renders text-only. The consuming pack must ship any texture
 * an `icon` points at.
 */
export type GuideTreeNode
  = | { t: 'page'; id: PageId; titleK: LangKey; icon?: string; descK?: LangKey }
    | { t: 'cat'; id: string; labelK: LangKey; collapsed?: boolean; link?: PageId; icon?: string; children: GuideTreeNode[] };

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
 * Narrow a manifest that arrived over the wire — `core.guides.of(addonId)` returns the
 * framework's loose two-field shape, since the runtime never inspects the contents.
 *
 * The check is deliberately shallow: it confirms the envelope (IR version, namespace, tree
 * and page table) rather than walking every block. A manifest is compiled by the filter and
 * replicated verbatim, so a deep validation would cost real ticks to catch a corruption mode
 * that can't occur without the transport already being broken.
 */
export function isGuideManifest(value: unknown): value is GuideManifest {
  if (typeof value !== 'object' || value === null) { return false; }

  const candidate = value as Partial<GuideManifest>;

  return candidate.v === 1
    && typeof candidate.ns === 'string'
    && Array.isArray(candidate.tree)
    && typeof candidate.pages === 'object'
    && candidate.pages !== null;
}

/**
 * Component registry for MDX `cmp` blocks (`<ItemRenderer … />` in a guide).
 * Unregistered names render an "unsupported content" placeholder.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- registry accepts heterogeneous component prop shapes; props are validated by the authoring filter, not here
export type GuideComponents = Record<string, FunctionComponent<any>>;

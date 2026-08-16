# @bedrock-core/guides

Docusaurus-style **in-game guides** for `@bedrock-core/ui`: author MDX, compile it at build time
with the [`guides` regolith filter](https://github.com/bedrock-core/regolith-filters/tree/main/guides),
render it as server forms with this package.

```
packs/data/guides/<locale>/**.mdx
      │  guides regolith filter
      ├─→ RP/texts/<locale>.lang            (auto-localized prose — client resolves per player language)
      └─→ @bedrock-core/generated/guides    (guide IR manifest: sidebar tree, pages, prev/next)
                │
                ▼  this package
      createGuide(manifest) → self-contained <Guide/>
```

## Usage

`createGuide(manifest)` returns a self-contained component that owns its own
home ⇆ page navigation (a page is not a host route). Host it behind a single
screen and let it drive itself:

```tsx
import { createGuide } from '@bedrock-core/guides';
import manifest from '@bedrock-core/generated/guides';
import type { ScreenProps } from '@bedrock-core/navigation';
import type { AppRoutes } from './routes'; // your own route map

// Build ONCE per manifest and cache it — the returned component holds the
// open-page state, so recreating it each render resets the guide to its home.
const Guide = createGuide(manifest, { title: 'My Addon' });

function GuideScreen({ navigation }: ScreenProps<AppRoutes, 'Guide'>) {
  return <Guide onExit={() => navigation.goBack()} />;
}
```

`onExit` fires when the user leaves from the guide's home screen (wire it to the
host's `navigation.goBack()`); the header's × button closes the whole UI via
`useExit`. Serving several addons? Call `createGuide` once per manifest, cache
each by addon id, and render the one your route's param selects.

## What renders how

| IR block | Renders as |
| --- | --- |
| headings | `Text` (`minecraftTen` for h1, scaled `mojangles` below) |
| paragraphs | one wrapping row of runs — plain text as `Text`, internal links as an inline transparent `Button` woven into the sentence |
| lists | bullet/numbered rows (same run-wrapping as paragraphs), one nesting level indented |
| images | `Image` height-capped and aspect-ratio-derived from compile-time-sniffed dimensions |
| admonitions | dark `Card` with a colored, localized title |
| code | dark `Card` of raw `§7` lines (pre-wrapped by the filter) |
| `<Component />` | looked up in the `components` registry passed via options; placeholder otherwise |

All prose renders as localized `Text` children — text is resolved client-side per player language
and wraps natively. Text *measurement* (ellipsis/`maxLines`) goes through the host's translation
resolver (the addon's `createI18n(bundle)` instance, or whatever `TranslationContext` provides);
run the `guides` filter **before** [`i18n`](https://github.com/bedrock-core/regolith-filters/tree/main/i18n)
so the guide's generated keys land in the same `.lang` files and runtime bundle.

## Home (the index)

The guide home is a visual table of contents: categories render as `minecraftTen` section headers
with a divider rule; pages render as icon-menu rows — a thumbnail, the title, an optional one-line
subtitle, and a `›` chevron. Both the thumbnail and subtitle are optional per entry, so an
unannotated guide degrades to a clean text list.

Feed them from page frontmatter (and `_category_.json` for a section's `icon`):

```yaml
---
title: Installation
icon: textures/ui/config/config   # RP texture path (≤80 chars); the pack must ship it
description: Add the pack and wire the filters.   # localized subtitle — keep it short
---
```

### When the index is skipped

An index is a choice between pages, so it earns its screen only when there is more than one.

- **One page** — the guide *is* that page. It opens there and offers no index; back leaves the
  guide rather than landing on a table of contents with a single row.
- **`home` set** — the manifest names a page to open on instead of the index, for when the index
  is not the introduction you would have written. The index stays one press away while there is
  more than one page. Authors set it with `home: true` in that page's frontmatter (usually
  alongside `hidden: true`); a `home` naming no page is ignored.

## API

- `createGuide(manifest, { title?, components? })` — a self-contained `(props: { onExit? }) => Element`
  guide component for one manifest.
- `GuideBlockList({ blocks, ns, onNavigate?, components? })` — the raw IR renderer, exported for
  custom layouts.
- `isGuideManifest(value)` — runtime guard for a manifest arriving over replicated state (or from
  a peer addon) before you hand it to `createGuide`.

The IR types are exported too — `GuideManifest`, `GuidePageData`, `GuideBlock`, `GuideTreeNode`,
`GuideListItem`, `GuideRun`, `GuideComponents`, `AdmonitionKind`, `PageId`, `LangKey` — for code
that builds or inspects a manifest without the filter (`@bedrock-core/config` hand-writes one for
the framework's own guide).

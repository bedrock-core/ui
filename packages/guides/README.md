# @bedrock-core/guides

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

Docusaurus-style **in-game guides** for [`@bedrock-core/ui`](https://github.com/bedrock-core/ui).
You author MDX, the [`guides` Regolith filter](https://bedrock-core.drav.dev/docs/ui/guides/regolith-filter)
compiles it at build time, and this package renders the result as server forms — index, pages,
prev/next, admonitions and all, with the prose localized per player language.

```
packs/data/guides/<locale>/**.mdx
      │  guides regolith filter
      ├─→ RP/texts/<locale>.lang            (auto-localized prose — the client resolves it)
      └─→ @bedrock-core/generated/guides    (manifest: sidebar tree, pages, prev/next)
                │
                ▼  this package
      createGuide(manifest) → self-contained <Guide/>
```

## Install

```bash
yarn add @bedrock-core/guides
regolith install github.com/bedrock-core/regolith-filters/guides
```

It also ships inside the umbrella package as `@bedrock-core/ui/guides`. Run the `guides` filter
**before** [`i18n`](https://bedrock-core.drav.dev/docs/ui/i18n/regolith-filter) so the generated
keys land in the same `.lang` files and runtime bundle.

## What it gives you

- `createGuide(manifest, { title?, components? })` — a self-contained guide component that owns its
  own home ⇆ page navigation, so the host only needs one screen for it
- **Blocks that render themselves** — headings, paragraphs with inline links, bullet and numbered
  lists, images sized from compile-time dimensions, admonitions, and code blocks
- **Your own components in the prose** — `<Component />` in MDX resolves against the `components`
  registry you pass
- **A visual index** — categories become section headers, pages become icon rows with an optional
  thumbnail and subtitle from frontmatter; a single-page guide skips the index entirely
- `GuideBlockList` for rendering the raw block IR under a custom layout, `isGuideManifest` for
  validating a manifest that arrived over replicated state, and the IR types for code that builds
  a manifest without the filter

## Usage

```tsx
/** @jsxImportSource @bedrock-core/ui */
import { createGuide } from '@bedrock-core/guides';
import manifest from '@bedrock-core/generated/guides';
import type { ScreenProps } from '@bedrock-core/navigation';
import type { JSX } from '@bedrock-core/ui';
import type { AppRoutes } from './routes'; // your own route map

// Build ONCE per manifest and cache it — the returned component holds the open-page
// state, so recreating it on each render resets the guide to its home.
const Guide = createGuide(manifest, { title: 'My Addon' });

export function GuideScreen({ navigation }: ScreenProps<AppRoutes, 'Guide'>): JSX.Element {
  return <Guide onExit={(): void => navigation.goBack()} />;
}
```

`onExit` fires when the player leaves from the guide's home screen; the header's × closes the whole
UI via `useExit`. Serving several addons? Call `createGuide` once per manifest, cache each by addon
id, and render the one your route's param selects.

## Documentation

- [guides](https://bedrock-core.drav.dev/docs/ui/guides) — `createGuide`, the block set, custom
  components, the manifest shape, publishing a guide cross-addon, and the API reference
- [guides Regolith filter](https://bedrock-core.drav.dev/docs/ui/guides/regolith-filter) —
  authoring, folder layout, frontmatter, the localization model and the filter settings

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).

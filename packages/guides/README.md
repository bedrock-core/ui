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
      ├─→ @bedrock-core/generated/guides    (manifest: sidebar tree, pages, prev/next)
      └─→ BP/scripts/guides/*.screen.tsx    (one screen module per page + the index)
                │
                ▼  this package, through the ui-compile filter
      one compiled screen per page, navigated by key
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

- `guideHomeScreen(manifest, …)` / `guidePageScreen(manifest, pageId, …)` — the screen per page the
  guides filter's generated modules export; the build bakes each into the pack. Every row, link and
  prev/next button is a `<Link>`, so nothing about moving through a guide reaches script
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

The filter writes the screen modules; nothing is written by hand. Opening the guide is one call:

```ts
import { openGuide } from '@bedrock-core/guides';
import manifest from '@bedrock-core/generated/guides';

openGuide('my_addon', player, { manifest });
```

It is a `navigate()` to the guide's index key (`<addon>:guide_home`), which is also how another
addon opens it — `navigate('my_addon:guide_home', player)` — from the reference this addon
published with `core.register({ screens: uiReference() })`. The header's × closes the whole UI via
`useExit`, and a guide belonging to a realm that is not running this addon's script is walked from
its references, drawn by the pack every client already holds.

## Documentation

- [guides](https://bedrock-core.drav.dev/docs/ui/guides) — the compiled screens, the block set, custom
  components, the manifest shape, publishing a guide cross-addon, and the API reference
- [guides Regolith filter](https://bedrock-core.drav.dev/docs/ui/guides/regolith-filter) —
  authoring, folder layout, frontmatter, the localization model and the filter settings

## License

MIT — see the [root repository](https://github.com/bedrock-core/ui).

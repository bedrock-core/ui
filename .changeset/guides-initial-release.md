---
'@bedrock-core/guides': minor
---

Initial release.

Docusaurus-style in-game guides. Author MDX, compile it at build time with the `guides` Regolith filter, render it as server forms with this package:

```tsx
import { createGuide } from '@bedrock-core/guides';

// Build ONCE per manifest and cache it — the returned component holds the open-page
// state, so recreating it each render resets the guide to its home.
const Guide = createGuide(guides, { title: 'My Addon' });

function GuideScreen({ navigation }: AppScreenProps<'Guide'>) {
  return <Guide onExit={() => navigation.goBack()} />;
}
```

The filter emits two things from `packs/data/guides/<locale>/**.mdx`: a `.lang` file per locale, so prose resolves in each player's own language, and a manifest — the sidebar tree, the pages, and prev/next links. `createGuide` returns a component that owns its own home ⇆ page navigation, so a whole guide sits behind a single host route.

Included:

- **Blocks** — headings, paragraphs with inline links, ordered and unordered lists with one level of nesting, images, code, rules, and five kinds of admonition.
- **Manifest IR** — owned here rather than by the server framework, which stores and replicates a manifest without ever reading inside one. `@bedrock-core/server-runtime` is deliberately not a dependency, so a guide renders without the framework.
- **`isGuideManifest`** — narrows a replicated payload to a document, so a peer publishing something malformed degrades instead of crashing the screen hosting it.

A manifest does not have to be generated. Keys that match no `.lang` entry render literally, so a hand-written single-page manifest can carry its prose inline — which is how `@bedrock-core/config` ships bedrock-core's own guide, having no pack to ship `.lang` files with.

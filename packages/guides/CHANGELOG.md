# @bedrock-core/guides

## 0.1.0

### Minor Changes

- [`8791ec3`](https://github.com/bedrock-core/ui/commit/8791ec37b51a339dca158d8644249cd388d9ad87) Thanks [@drav0011](https://github.com/drav0011)! - Initial release.

  Docusaurus-style in-game guides. Author MDX, compile it at build time with the `guides` Regolith filter, render it as server forms with this package:

  ```tsx
  import { createGuide } from "@bedrock-core/guides";

  // Build ONCE per manifest and cache it — the returned component holds the open-page
  // state, so recreating it each render resets the guide to its home.
  const Guide = createGuide(guides, { title: "My Addon" });

  function GuideScreen({ navigation }: AppScreenProps<"Guide">) {
    return <Guide onExit={() => navigation.goBack()} />;
  }
  ```

  The filter emits two things from `packs/data/guides/<locale>/**.mdx`: a `.lang` file per locale, so prose resolves in each player's own language, and a manifest — the sidebar tree, the pages, and prev/next links. `createGuide` returns a component that owns its own home ⇆ page navigation, so a whole guide sits behind a single host route.

  Included:

  - **Blocks** — headings, paragraphs with inline links, ordered and unordered lists with one level of nesting, images, code, rules, and five kinds of admonition.
  - **Manifest IR** — owned here rather than by the server framework, which stores and replicates a manifest without ever reading inside one. `@bedrock-core/server-runtime` is deliberately not a dependency, so a guide renders without the framework.
  - **`isGuideManifest`** — narrows a replicated payload to a document, so a peer publishing something malformed degrades instead of crashing the screen hosting it.
  - **Landing page** — an index is a choice between pages, so it earns its screen only when there is more than one. A single-page guide opens on its page with no index at all, and `manifest.home` names a page to open on instead of the index when the index is not the introduction you would have written. Authors set it with `home: true` in frontmatter.

  A manifest does not have to be generated. Keys that match no `.lang` entry render literally, so a hand-written single-page manifest can carry its prose inline — which is how `@bedrock-core/config` ships bedrock-core's own guide, having no pack to ship `.lang` files with.

- [`79660f8`](https://github.com/bedrock-core/ui/commit/79660f8726e480ab35c31da7adfe578998e29ab6) Thanks [@drav0011](https://github.com/drav0011)! - Operator-only guide pages.

  Author a page — or a whole `_category_.json` — with `access: op` and it is compiled for operators only. Access inherits downward and is never widened by a child, so the manifest carries the effective value on every page and sidebar node.

  ```tsx
  const audience = isOperator(player) ? "op" : "player";
  const Guide = createGuide(guides, { title: "My Addon", audience });
  ```

  For a `'player'`, gated pages and categories leave the sidebar (a category that empties out goes with them), prev/next follows a chain baked without them, the landing page is resolved over what they can see, and an inline link to a gated page renders as prose. `hasVisiblePages(manifest, audience)` says whether there is anything in there for them at all.

  Build the component **per audience** and key any cache by audience as well as by addon — the landing page and sidebar are decided when the component is built.

  Gating is presentation, not protection: manifests replicate world-wide and the prose ships in the pack's `.lang`, so it decides what a player is shown, not what they may do.

  `@bedrock-core/config` applies it end to end: the list's Guide button greys out when there is nothing to read, and `clampTarget` sends a `:guide` command to the addon list instead of an empty index. **`clampTarget(target, player)` now takes a third argument, `core`.**

  A guide with nothing gated compiles byte-identically to before.

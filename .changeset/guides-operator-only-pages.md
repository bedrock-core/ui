---
'@bedrock-core/guides': minor
'@bedrock-core/config': minor
---

Operator-only guide pages.

Author a page — or a whole `_category_.json` — with `access: op` and it is compiled for operators only. Access inherits downward and is never widened by a child, so the manifest carries the effective value on every page and sidebar node.

```tsx
const audience = isOperator(player) ? 'op' : 'player';
const Guide = createGuide(guides, { title: 'My Addon', audience });
```

For a `'player'`, gated pages and categories leave the sidebar (a category that empties out goes with them), prev/next follows a chain baked without them, the landing page is resolved over what they can see, and an inline link to a gated page renders as prose. `hasVisiblePages(manifest, audience)` says whether there is anything in there for them at all.

Build the component **per audience** and key any cache by audience as well as by addon — the landing page and sidebar are decided when the component is built.

Gating is presentation, not protection: manifests replicate world-wide and the prose ships in the pack's `.lang`, so it decides what a player is shown, not what they may do.

`@bedrock-core/config` applies it end to end: the list's Guide button greys out when there is nothing to read, and `clampTarget` sends a `:guide` command to the addon list instead of an empty index. **`clampTarget(target, player)` now takes a third argument, `core`.**

A guide with nothing gated compiles byte-identically to before.

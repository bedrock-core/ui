# @bedrock-core/flexbox

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

A flexbox layout engine in pure TypeScript, sized for Minecraft Bedrock UI. It follows the CSS
flexbox model — the same `justifyContent` / `alignItems` / `flexGrow` semantics you already know —
over the subset that makes sense here: no grid, no floats, and `display` is only `flex` or `none`.
Give it a tree of styled nodes and it resolves every box to absolute texel positions against
the Bedrock pocket screen (320×210), with no dependencies and no build step.

This is a **low-level engine**. If you are building a Bedrock UI, use
[`@bedrock-core/ui`](https://github.com/bedrock-core/ui) — it drives this engine for you. Reach for
the package directly only when writing a custom renderer, a codegen tool, or another framework
layer.

## Install

```bash
yarn add @bedrock-core/flexbox
```

It also ships inside the umbrella package as `@bedrock-core/ui/flexbox`.

## What it gives you

- `createNode(style?, children?, measure?)` — build a layout node
- `computeLayout(root, refWidth?, refHeight?)` — solve the tree in place
- The CSS subset that matters: `flexDirection`, `wrap`, `justifyContent`, `alignItems`,
  `alignContent`, `alignSelf`, `flex`/`flexGrow`/`flexShrink`/`flexBasis`, `gap`/`rowGap`/
  `columnGap`, padding and margin (texels or percent), `min`/`max` constraints, `aspectRatio`,
  `position: 'absolute'` with `top`/`right`/`bottom`/`left` insets, `zIndex`, `display: 'none'`
- **Content measurement** — a leaf whose height depends on the width it is granted (wrapping text)
  supplies a `MeasureFunc`, and the solver runs a bounded fixpoint around it
- `SCREEN` / `CANONICAL_SCREEN` reference dimensions, plus the `isPercent` / `resolveSize` helpers

## Usage

```ts
import { computeLayout, createNode } from '@bedrock-core/flexbox';

const root = createNode({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 10,
});

const sidebar = createNode({ width: 80 });
const content = createNode({ flex: 1 });

root.children.push(sidebar, content);

computeLayout(root); // defaults to the 320×210 pocket screen

sidebar.layout; // { x, y, width, height, zIndex } — absolute texels, rounded integers
content.layout;
```

`node.layout` is zeroed until `computeLayout()` runs. Pass explicit reference dimensions for other
targets — `computeLayout(root, SCREEN.DESKTOP.width, SCREEN.DESKTOP.height)`.

## Documentation

- [flexbox](https://bedrock-core.drav.dev/docs/ui/flexbox) — overview and screen constants
- [`createNode`](https://bedrock-core.drav.dev/docs/ui/flexbox/createNode) — the full `FlexStyle`
  reference: every property, its type, its default
- [`computeLayout`](https://bedrock-core.drav.dev/docs/ui/flexbox/computeLayout) — signature,
  worked examples, and the `isPercent` / `resolveSize` utilities

## License

MIT

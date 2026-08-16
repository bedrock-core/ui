# @bedrock-core/flexbox

![Logo](https://raw.githubusercontent.com/bedrock-core/ui/main/assets/logo/title.png)

> ⚠️ Beta Status: Active development. Breaking changes may occur until 1.0.0. Pin exact versions for stability.

Flexbox layout engine for Minecraft Bedrock UI. Computes absolute texel positions and sizes for a tree of layout nodes using a CSS-compatible flexbox algorithm, targeting the Bedrock pocket screen (320×210 texels) as the canonical reference.

## Installation

This package is typically installed as a dependency of `@bedrock-core/ui`:

```bash
yarn add @bedrock-core/ui
```

Or directly:

```bash
yarn add @bedrock-core/flexbox
```

## Quick Start

```typescript
import { createNode, computeLayout } from '@bedrock-core/flexbox';

// Build a layout tree
const root = createNode({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 10,
});

const sidebar = createNode({ width: 80 });
const content = createNode({ flex: 1 });

root.children.push(sidebar, content);

// Compute layout (defaults to 320×210 pocket screen)
computeLayout(root);

// Read resolved absolute texel values
console.log(sidebar.layout); // { x, y, width, height, zIndex }
console.log(content.layout); // { x, y, width, height, zIndex }
```

## API

### `createNode(style?, children?, measure?)`

Create a layout node with an optional style, pre-populated children, and an optional content
measure callback.

```typescript
const node = createNode(
  { flexDirection: 'column', padding: 5 },
  [createNode({ height: 20 }), createNode({ flex: 1 })],
);
```

The `layout` field is zeroed on creation and is filled only after `computeLayout()` runs.

### `measure` — width-dependent leaves

A **leaf** whose intrinsic size depends on the width it is granted (wrapping text: narrower box →
more lines → taller) supplies a `MeasureFunc`:

```typescript
type MeasureFunc = (availableWidth: number) => MeasuredSize; // { width, height }

const label = createNode({}, [], (available) => measureText(str, available));
```

`computeLayout()` drives it:

1. once with `Infinity` to seed the max-content size (CSS `auto` flex-basis semantics), and
2. after each solve with the node's granted `layout.width`, re-solving when the returned size
   changed — a bounded fixpoint, since heights almost never feed back into widths.

A measured size takes precedence over child-derived sizing, but an explicit `style.width` /
`style.height` always wins over the measured size. A collapsed leaf (granted width ≤ 0) keeps its
seed rather than measuring at 0.

### `computeLayout(root, refWidth?, refHeight?)`

Compute absolute texel positions and sizes for the entire tree.

```typescript
// Default: pocket screen (320×210)
computeLayout(root);

// Custom reference dimensions
computeLayout(root, 376, 250); // desktop screen
```

After this call every `node.layout` holds absolute texel values:

- `x`, `y` — top-left corner from screen origin (0, 0)
- `width`, `height` — dimensions in texels
- `zIndex` — resolved z-order (inherits from parent when not explicitly set)

The algorithm uses a 3-pass BFS approach:

1. **Pass 1** — build level-order list and parent map
2. **Pass 2** (bottom-up, 3 iterations) — resolve content-driven and explicit sizes; handles percent padding convergence
3. **Pass 3** (top-down) — resolve percent sizes, distribute flex grow/shrink, position children

### `CANONICAL_SCREEN` / `SCREEN`

Reference screen dimensions in texels:

```typescript
import { CANONICAL_SCREEN, SCREEN } from '@bedrock-core/flexbox';

SCREEN.POCKET  // { width: 320, height: 210 }
SCREEN.DESKTOP // { width: 376, height: 250 }
CANONICAL_SCREEN // same as SCREEN.POCKET
```

### `isPercent(value)` / `resolveSize(value, parentSize)`

Size-resolution helpers, exported for consumers that build their own layout logic (the
ui-runtime bridge uses them):

```typescript
isPercent('50%')            // true — narrows to `Percent`
resolveSize('50%', 200)     // 100
resolveSize(80, 200)        // 80
resolveSize('auto', 200)    // undefined — the caller decides the fallback
```

## Supported Properties

### Display & Positioning

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `display` | `'flex'` \| `'none'` | `'flex'` | Hide node and all descendants when `'none'` |
| `position` | `'relative'` \| `'absolute'` | `'relative'` | Absolute nodes are removed from flow |

### Sizing

Sizes are **texels** (integer) or **percent strings** (`"50%"`) relative to the parent container.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | `number \| Percent` | auto | Explicit width |
| `height` | `number \| Percent` | auto | Explicit height |
| `minWidth` | `number \| Percent` | — | Minimum width constraint |
| `maxWidth` | `number \| Percent` | — | Maximum width constraint |
| `minHeight` | `number \| Percent` | — | Minimum height constraint |
| `maxHeight` | `number \| Percent` | — | Maximum height constraint |
| `aspectRatio` | `number` | — | `width ∕ height`; derives the auto axis from the definite one |

**`aspectRatio`** transfers the definite axis onto the auto one. The driver is explicit
`width` → width, explicit `height` → height, both auto → width (the parent-driven axis in
columns and in absolute `left`+`right` insets, the flex-grown axis in rows). It is a no-op when
both axes are explicit (matching CSS) or when the node is content-measured — the `measure`
callback owns both dimensions there. A percent axis only counts as definite once it has been
resolved against the parent, so the ratio never derives the other axis from a still-zero value.

### Flex Container

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `flexDirection` | `'row'` \| `'row-reverse'` \| `'column'` \| `'column-reverse'` | `'column'` | Main axis direction |
| `wrap` | `'nowrap'` \| `'wrap'` \| `'wrap-reverse'` | `'nowrap'` | Multi-line wrapping |
| `justifyContent` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'space-between'` \| `'space-around'` \| `'space-evenly'` | `'flex-start'` | Main axis alignment |
| `alignItems` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'stretch'` | `'stretch'` | Cross axis alignment |
| `alignContent` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'stretch'` \| `'space-between'` \| `'space-around'` | `'stretch'` | Multi-line cross axis |
| `gap` | `number \| Percent` | `0` | Gap between items |
| `rowGap` | `number \| Percent` | `0` | Row gap override |
| `columnGap` | `number \| Percent` | `0` | Column gap override |

### Flex Item

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `flex` | `number` | — | Shorthand for `flexGrow` when `flexGrow` is not set |
| `flexGrow` | `number` | `0` | Growth factor |
| `flexShrink` | `number` | `1` | Shrink factor |
| `flexBasis` | `number \| Percent \| 'auto'` | `'auto'` | Initial main size |
| `alignSelf` | `'auto'` \| `AlignItems` | `'auto'` | Override container's `alignItems` |

### Spacing

Percent values resolve against the **parent content-box width** (all four sides for padding/margin). Gap percent resolves against the container's own content-box dimension on that axis.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `padding` | `number \| Percent` | `0` | Inner spacing, all sides |
| `paddingTop/Right/Bottom/Left` | `number \| Percent` | `0` | Individual padding |
| `margin` | `number \| Percent` | `0` | Outer spacing, all sides |
| `marginTop/Right/Bottom/Left` | `number \| Percent` | `0` | Individual margin |

### Absolute Positioning Offsets

Only applies when `position: 'absolute'`. Offsets are in texels relative to the parent.

| Property | Type | Description |
|----------|------|-------------|
| `top` | `number` | Distance from parent top |
| `right` | `number` | Distance from parent right |
| `bottom` | `number` | Distance from parent bottom |
| `left` | `number` | Distance from parent left |

When both `left` + `right` are set without `width`, the node is stretched to fill the horizontal space. Same for `top` + `bottom` without `height`.

### Z-order

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `zIndex` | `number` | inherited | Z-order layer; inherits from parent when not set |

## Examples

### Centered content

```typescript
const root = createNode({ justifyContent: 'center', alignItems: 'center' });
root.children.push(createNode({ width: 100, height: 60 }));
computeLayout(root);
```

### Sidebar layout

```typescript
const root = createNode({ flexDirection: 'row' });
root.children.push(
  createNode({ width: 80 }),   // fixed sidebar
  createNode({ flex: 1 }),     // content fills remainder
);
computeLayout(root);
```

### Wrapping grid

```typescript
const grid = createNode({ flexDirection: 'row', wrap: 'wrap', gap: 4 });
for (let i = 0; i < 9; i++) {
  grid.children.push(createNode({ width: 100, height: 60 }));
}
computeLayout(grid);
```

### Absolute overlay

```typescript
const root = createNode({});
root.children.push(
  createNode({ flex: 1 }),                                 // normal flow
  createNode({ position: 'absolute', top: 0, right: 0, width: 40, height: 20 }), // overlay
);
computeLayout(root);
```

### Custom screen size

```typescript
import { computeLayout, SCREEN } from '@bedrock-core/flexbox';

computeLayout(root, SCREEN.DESKTOP.width, SCREEN.DESKTOP.height);
```

## Output Format

After `computeLayout()`, each node exposes a `layout` property:

```typescript
interface ComputedLayout {
  x: number;      // texels from screen left
  y: number;      // texels from screen top
  width: number;  // texels
  height: number; // texels
  zIndex: number; // resolved z-order
}
```

All values are rounded integers.

## License

MIT

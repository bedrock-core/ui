# @bedrock-core/flexbox

A TypeScript flexbox layout engine that operates entirely in **percentage mode**. Designed for use with `@bedrock-core/ui` to compute layouts for Minecraft Bedrock UI.

## Features

- 🎯 **Percentage-based** - All coordinates and sizes are percentages (0-100)
- 📦 **Full Flexbox Support** - `flex-direction`, `flex-wrap`, `justify-content`, `align-items`, `align-content`
- 🌳 **Tree Structure** - Nested flex containers with recursive layout computation
- 🎨 **Gap Support** - `gap`, `rowGap`, `columnGap` for spacing between items
- 📐 **Size Constraints** - `minWidth`, `maxWidth`, `minHeight`, `maxHeight`
- 🔄 **Flex Items** - `flexGrow`, `flexShrink`, `flexBasis`, `alignSelf`, `order`

## Installation

```bash
yarn add @bedrock-core/flexbox
```

## Quick Start

```typescript
import { createNode, computeLayout } from '@bedrock-core/flexbox';

// Create a row container with space-between
const root = createNode({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 2,
});

// Add children with flex properties
root.addChild(createNode({ flexGrow: 1 }));        // Takes remaining space
root.addChild(createNode({ flexBasis: 30 }));      // Fixed 30%
root.addChild(createNode({ flexGrow: 2 }));        // Takes 2x remaining space

// Compute layout (root is always 100x100%)
computeLayout(root);

// Access computed layouts
root.children.forEach(child => {
  console.log(child.layout); // { x, y, width, height } in %
});
```

## API

### `createNode(style?, id?)`

Create a new flex node.

```typescript
const node = createNode({
  flexDirection: 'column',
  padding: 5,
}, 'my-node');
```

### `computeLayout(root)`

Compute layout for the entire tree. The root node is positioned at `x=0, y=0, width=100, height=100`.

```typescript
computeLayout(root);
// All nodes now have computed .layout property
```

### `FlexNode`

The node class with helper methods:

```typescript
node.addChild(child);        // Add a child node
node.addChildren(a, b, c);   // Add multiple children
node.removeChild(child);     // Remove a child
node.isRoot();               // Check if root node
node.isRowDirection();       // Check if row/row-reverse
node.isReversed();           // Check if reversed direction
node.getStyle('flexGrow');   // Get style with default fallback
node.getPadding();           // Get resolved padding { top, right, bottom, left }
node.getMargin();            // Get resolved margin { top, right, bottom, left }
```

## Supported Properties

### Container Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `flexDirection` | `'row'` \| `'row-reverse'` \| `'column'` \| `'column-reverse'` | `'row'` | Main axis direction |
| `flexWrap` | `'nowrap'` \| `'wrap'` \| `'wrap-reverse'` | `'nowrap'` | Multi-line wrapping |
| `justifyContent` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'space-between'` \| `'space-around'` \| `'space-evenly'` | `'flex-start'` | Main axis alignment |
| `alignItems` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'stretch'` | `'stretch'` | Cross axis alignment |
| `alignContent` | `'flex-start'` \| `'flex-end'` \| `'center'` \| `'stretch'` \| `'space-between'` \| `'space-around'` | `'stretch'` | Multi-line cross axis |
| `gap` | `number` | `0` | Gap between items (%) |
| `rowGap` | `number` | `0` | Row gap override (%) |
| `columnGap` | `number` | `0` | Column gap override (%) |

### Item Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `flexGrow` | `number` | `0` | Growth factor |
| `flexShrink` | `number` | `1` | Shrink factor |
| `flexBasis` | `number` \| `'auto'` | `'auto'` | Initial main size (%) |
| `alignSelf` | `'auto'` \| `AlignItems` | `'auto'` | Override container's alignItems |
| `order` | `number` | `0` | Display order |

### Sizing Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | `number` \| `'auto'` | `'auto'` | Explicit width (%) |
| `height` | `number` \| `'auto'` | `'auto'` | Explicit height (%) |
| `minWidth` | `number` | `0` | Minimum width (%) |
| `maxWidth` | `number` | `100` | Maximum width (%) |
| `minHeight` | `number` | `0` | Minimum height (%) |
| `maxHeight` | `number` | `100` | Maximum height (%) |

### Spacing Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `padding` | `number` | `0` | Inner spacing all sides (%) |
| `paddingTop/Right/Bottom/Left` | `number` | `0` | Individual padding (%) |
| `margin` | `number` | `0` | Outer spacing all sides (%) |
| `marginTop/Right/Bottom/Left` | `number` | `0` | Individual margin (%) |

## Examples

### Centered Content

```typescript
const centered = createNode({
  justifyContent: 'center',
  alignItems: 'center',
});
centered.addChild(createNode({ width: 50, height: 50 }));
```

### Sidebar Layout

```typescript
const layout = createNode({ flexDirection: 'row' });
layout.addChild(createNode({ width: 20 }));           // Sidebar 20%
layout.addChild(createNode({ flexGrow: 1 }));         // Content fills rest
```

### Grid with Wrap

```typescript
const grid = createNode({
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 2,
});
// Add items that wrap to next line
for (let i = 0; i < 9; i++) {
  grid.addChild(createNode({ width: 30, height: 30 })); // 3 per row
}
```

### Nested Containers

```typescript
const outer = createNode({ flexDirection: 'column', padding: 5 });
const header = createNode({ height: 10 });
const body = createNode({ flexGrow: 1, flexDirection: 'row' });
const footer = createNode({ height: 10 });

outer.addChildren(header, body, footer);

// Body has nested flex layout
body.addChild(createNode({ width: 25 }));  // Sidebar
body.addChild(createNode({ flexGrow: 1 })); // Main content
```

## Output Format

After `computeLayout()`, each node has a `layout` property:

```typescript
interface ComputedLayout {
  x: number;      // % from parent left
  y: number;      // % from parent top
  width: number;  // % of parent width
  height: number; // % of parent height
}
```

## License

MIT

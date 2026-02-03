# Flexbox Layout Engine - Plan

## Overview

A TypeScript ES Modules flexbox layout engine that operates entirely in **percentage mode**.

### Core Constraints

- **Root Node**: `x=0%, y=0%, width=100%, height=100%`
- **All coordinates**: Expressed as percentages (0-100)
- **All sizes**: Expressed as percentages (0-100)
- **Output**: Each node receives computed `x%, y%, width%, height%`

---

## Flexbox Properties to Support

### Container Properties

| Property | Values | Priority | Notes |
|----------|--------|----------|-------|
| `display` | `flex` | ✅ Must | Entry point |
| `flexDirection` | `row`, `row-reverse`, `column`, `column-reverse` | ✅ Must | Main axis direction |
| `flexWrap` | `nowrap`, `wrap`, `wrap-reverse` | ✅ Must | Multi-line support |
| `justifyContent` | `flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly` | ✅ Must | Main axis alignment |
| `alignItems` | `flex-start`, `flex-end`, `center`, `stretch` | ✅ Must | Cross axis alignment |
| `alignContent` | `flex-start`, `flex-end`, `center`, `stretch`, `space-between`, `space-around` | 🔶 Should | Multi-line cross axis |
| `gap` | `number` (%) | ✅ Must | Gap between items |
| `rowGap` | `number` (%) | 🔶 Should | Row-specific gap |
| `columnGap` | `number` (%) | 🔶 Should | Column-specific gap |

### Item Properties

| Property | Values | Priority | Notes |
|----------|--------|----------|-------|
| `flexGrow` | `number` (default: 0) | ✅ Must | Growth factor |
| `flexShrink` | `number` (default: 1) | ✅ Must | Shrink factor |
| `flexBasis` | `number` (%) or `auto` | ✅ Must | Initial size |
| `alignSelf` | `auto`, `flex-start`, `flex-end`, `center`, `stretch` | ✅ Must | Override alignItems |
| `order` | `number` | 🔶 Should | Display order |

### Size Properties (All in %)

| Property | Values | Priority | Notes |
|----------|--------|----------|-------|
| `width` | `number` (%) or `auto` | ✅ Must | Explicit width |
| `height` | `number` (%) or `auto` | ✅ Must | Explicit height |
| `minWidth` | `number` (%) | 🔶 Should | Minimum width |
| `maxWidth` | `number` (%) | 🔶 Should | Maximum width |
| `minHeight` | `number` (%) | 🔶 Should | Minimum height |
| `maxHeight` | `number` (%) | 🔶 Should | Maximum height |

### Spacing Properties (All in %)

| Property | Values | Priority | Notes |
|----------|--------|----------|-------|
| `padding` | `number` (%) | 🔶 Should | Inner spacing |
| `paddingTop/Right/Bottom/Left` | `number` (%) | 🔶 Should | Individual padding |
| `margin` | `number` (%) | 🔶 Should | Outer spacing |
| `marginTop/Right/Bottom/Left` | `number` (%) | 🔶 Should | Individual margin |

---

## Priority Legend

- ✅ **Must** - Phase 1 (Core functionality)
- 🔶 **Should** - Phase 2 (Enhanced features)
- ⚪ **Could** - Phase 3 (Nice to have)

---

## Project Structure

```
src/
├── index.ts              # Main entry point, exports public API
├── types.ts              # All TypeScript interfaces and types
├── node.ts               # FlexNode class definition
├── layout.ts             # Main layout computation engine
├── algorithms/
│   ├── mainAxis.ts       # Main axis (justify-content) calculations
│   ├── crossAxis.ts      # Cross axis (align-items) calculations
│   └── wrap.ts           # Flex wrap calculations
└── utils/
    └── helpers.ts        # Utility functions
```

---

## Type Definitions (Draft)

```typescript
// Flex direction
type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';

// Flex wrap
type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

// Justify content (main axis)
type JustifyContent = 
  | 'flex-start' 
  | 'flex-end' 
  | 'center' 
  | 'space-between' 
  | 'space-around' 
  | 'space-evenly';

// Align items (cross axis)
type AlignItems = 
  | 'flex-start' 
  | 'flex-end' 
  | 'center' 
  | 'stretch';

// Align self (item override)
type AlignSelf = 'auto' | AlignItems;

// Align content (multi-line)
type AlignContent = 
  | 'flex-start' 
  | 'flex-end' 
  | 'center' 
  | 'stretch' 
  | 'space-between' 
  | 'space-around';

// Node style input
interface FlexStyle {
  // Container
  flexDirection?: FlexDirection;
  flexWrap?: FlexWrap;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  alignContent?: AlignContent;
  gap?: number;
  
  // Item
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | 'auto';
  alignSelf?: AlignSelf;
  order?: number;
  
  // Sizing (all %)
  width?: number | 'auto';
  height?: number | 'auto';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  
  // Spacing (all %)
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  margin?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}

// Computed layout output
interface ComputedLayout {
  x: number;      // % from parent left
  y: number;      // % from parent top
  width: number;  // % of parent width
  height: number; // % of parent height
}

// Node with children
interface FlexNode {
  id?: string;
  style: FlexStyle;
  children: FlexNode[];
  layout?: ComputedLayout;
}
```

---

## API Design

```typescript
// Create a node
const root = createNode({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
});

// Add children
root.addChild(createNode({ flexGrow: 1 }));
root.addChild(createNode({ flexBasis: 30 })); // 30%
root.addChild(createNode({ flexGrow: 2 }));

// Compute layout
computeLayout(root);

// Access results
root.children.forEach(child => {
  console.log(child.layout); // { x, y, width, height } in %
});
```

---

## Algorithm Overview

### Phase 1: Collect & Measure
1. Determine main axis and cross axis based on `flexDirection`
2. Calculate base sizes from `flexBasis`, `width`, `height`
3. Sum up total base size on main axis

### Phase 2: Flex Distribution
1. Calculate remaining space (100% - total base size - gaps)
2. If positive space: distribute to items with `flexGrow > 0`
3. If negative space: shrink items with `flexShrink > 0`

### Phase 3: Main Axis Positioning
1. Apply `justifyContent` to position items on main axis
2. Account for gaps between items

### Phase 4: Cross Axis Sizing & Alignment
1. Apply `alignItems` / `alignSelf` for cross axis sizing
2. `stretch`: fill available cross axis space
3. Others: use intrinsic/specified size

### Phase 5: Wrapping (if enabled)
1. Check if items overflow main axis
2. Create new flex lines as needed
3. Apply `alignContent` for line distribution

### Phase 6: Recursion
1. For each child that is also a flex container
2. Recursively compute layout within child's bounds

---

## Implementation Phases

### Phase 1 - Core (MVP)
- [ ] Basic types and interfaces
- [ ] FlexNode class
- [ ] `flexDirection`: row, column
- [ ] `flexGrow` distribution
- [ ] `justifyContent`: all values
- [ ] `alignItems`: all values
- [ ] Basic `gap` support

### Phase 2 - Enhanced
- [ ] `flexDirection`: reverse variants
- [ ] `flexShrink` when overflow
- [ ] `flexBasis` with auto
- [ ] `alignSelf` override
- [ ] `flexWrap` and `alignContent`
- [ ] Min/max constraints
- [ ] Padding support

### Phase 3 - Polish
- [ ] `order` property
- [ ] Margin support (with auto margins)
- [ ] Edge cases and validation
- [ ] Performance optimization
- [ ] Comprehensive tests

---

## Testing Strategy

- Unit tests for each algorithm module
- Integration tests for full layouts
- Visual comparison tests (optional)
- Edge cases: empty containers, single child, deeply nested

---

## Questions to Resolve

1. **Auto margins**: Support for centering tricks?
2. **Nested percentages**: Child 50% of parent 50% = 25% of root?
3. **Aspect ratio**: Support maintaining aspect ratios?

---

## Next Steps

1. Review and finalize property list
2. Set up TypeScript project with ES modules
3. Implement Phase 1 core functionality
4. Add tests as we go

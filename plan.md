ok time for a plan
our current #codebase takes elements x, y, width, height and converts them from a tree like structure to a flattened structure so it can be rendered correctly by the game engine

we want to add an intermediary step into the flow
our current layout is very limited and it is directly tied to how the game renders, that means all elements origin is 0, 0 and we need to "manually" add spacing for the nesting of elements to be treated properly

we want to be able to have css like display flex and block to start for a layout
so we will be using flexbox.js

## Integration Plan

### 1. Current Flow (Before)
```
JSX Element Tree
    ↓
buildTree() (expand components, resolve contexts)
    ↓
serialize() (encode to fixed-width fields)
    ↓
present() (inject into form.label())
    ↓
JSON UI decodes & renders
```

**Problem:** Manual positioning with x/y offsets, no automatic layout

### 2. New Flow (After)
```
JSX Element Tree
    ↓
buildTree() (expand components, resolve contexts)
    ↓
🆕 computeLayout() (flexbox.js calculates positions/sizes)
    ↓
serialize() (encode computed layout to fixed-width fields)
    ↓
present() (inject into form.label())
    ↓
JSON UI decodes & renders
```

### 3. Component Changes

#### Add Layout Props to ControlProps
**File:** `src/components/control.ts`

```typescript
import type { Percent } from '../util';

export interface ControlProps {
  // 🗑️ REMOVED: Manual positioning (x, y) - layout engine handles this
  // ✅ KEPT: Dimensions now use Percent type
  width?: Percent;
  height?: Percent;
  
  // Existing non-layout props
  visible?: boolean;
  enabled?: boolean;
  layer?: number;
  alpha?: number;
  
  // 🆕 NEW Layout props - all sizes/spaces use Percent
  display?: 'flex' | 'block';           // Layout mode
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly' | 'stretch';
  wrap?: boolean;                       // flex-wrap
  gap?: Percent;                         // spacing between children
  padding?: Percent | { top?: Percent; right?: Percent; bottom?: Percent; left?: Percent };
  
  // FlexItem props (for children in flex containers) - all use Percent
  flexGrow?: number;                    // unitless number (CSS flex-grow)
  flexShrink?: number;                  // unitless number (CSS flex-shrink)
  alignSelf?: 'flex-start' | 'flex-end' | 'center' | 'stretch';
  margin?: Percent | { top?: Percent; right?: Percent; bottom?: Percent; left?: Percent };
  minWidth?: Percent;
  maxWidth?: Percent;
  minHeight?: Percent;
  maxHeight?: Percent;
}
```

#### Update Percent Type Usage
**File:** `src/util/percent.ts`

```typescript
// Percent can be: number (pixels) or string (percentage)
export type Percent = number | `${number}%`;

// Convert Percent to pixels
export function resolvePercent(value: Percent, parentSize: number): number {
  if (typeof value === 'string' && value.endsWith('%')) {
    const percent = parseFloat(value);
    return (percent / 100) * parentSize;
  }
  return value as number;
}
```

#### Update withControl()
- Layout props are NOT serialized (used only for computation)
- After layout, computed x/y/width/height (as numbers) get serialized

### 4. New Layout Phase

**File:** `src/core/render/phases/layout.ts` (new file)

```typescript
import { FlexTarget } from 'flexbox.js';
import type { JSX } from '../../../jsx';
import { resolvePercent } from '../../../util';

/**
 * Converts Percent value to number for flexbox.js
 * For relative sizes, uses parent dimensions or returns 0 for auto-sizing
 */
function resolveSize(value: Percent | undefined, parentSize: number): number {
  if (value === undefined) return 0; // 0 = fit-to-contents in flexbox.js
  return resolvePercent(value, parentSize);
}

function resolveSpacing(
  value: Percent | { top?: Percent; right?: Percent; bottom?: Percent; left?: Percent } | undefined,
  parentSize: number
): number | { top: number; right: number; bottom: number; left: number } {
  if (value === undefined) return 0;
  
  if (typeof value === 'object' && !('toString' in value)) {
    // Object with sides
    return {
      top: resolvePercent(value.top ?? 0, parentSize),
      right: resolvePercent(value.right ?? 0, parentSize),
      bottom: resolvePercent(value.bottom ?? 0, parentSize),
      left: resolvePercent(value.left ?? 0, parentSize),
    };
  }
  
  // Single value
  return resolvePercent(value as Percent, parentSize);
}

/**
 * Converts JSX element tree to FlexTarget tree for layout calculation
 */
function buildFlexTree(
  element: JSX.Element, 
  parent?: FlexTarget,
  parentWidth: number = 0,
  parentHeight: number = 0
): FlexTarget {
  const node = new FlexTarget();
  
  // Apply display mode
  if (element.props.display === 'flex') {
    node.flex.enabled = true;
    node.flex.direction = element.props.flexDirection ?? 'row';
    node.flex.justifyContent = element.props.justifyContent ?? 'flex-start';
    node.flex.alignItems = element.props.alignItems ?? 'stretch';
    node.flex.alignContent = element.props.alignContent;
    node.flex.wrap = element.props.wrap ?? false;
    
    // Apply padding (convert Percent to number)
    const padding = resolveSpacing(element.props.padding, parentWidth);
    if (typeof padding === 'number') {
      node.flex.padding = padding;
    } else {
      node.flex.paddingTop = padding.top;
      node.flex.paddingRight = padding.right;
      node.flex.paddingBottom = padding.bottom;
      node.flex.paddingLeft = padding.left;
    }
  }
  
  // Apply flex item props (if parent is flex)
  if (parent?.flex.enabled) {
    node.flexItem.grow = element.props.flexGrow ?? 0;
    node.flexItem.shrink = element.props.flexShrink ?? 0;
    node.flexItem.alignSelf = element.props.alignSelf;
    
    // Apply margin (convert Percent to number)
    const margin = resolveSpacing(element.props.margin, parentWidth);
    if (typeof margin === 'number') {
      node.flexItem.margin = margin;
    } else {
      node.flexItem.marginTop = margin.top;
      node.flexItem.marginRight = margin.right;
      node.flexItem.marginBottom = margin.bottom;
      node.flexItem.marginLeft = margin.left;
    }
    
    // Min/max constraints
    node.flexItem.minWidth = resolveSize(element.props.minWidth, parentWidth);
    node.flexItem.minHeight = resolveSize(element.props.minHeight, parentHeight);
    node.flexItem.maxWidth = resolveSize(element.props.maxWidth, parentWidth);
    node.flexItem.maxHeight = resolveSize(element.props.maxHeight, parentHeight);
  }
  
  // Apply base dimensions (convert Percent to number)
  node.w = resolveSize(element.props.width, parentWidth);
  node.h = resolveSize(element.props.height, parentHeight);
  
  // Calculate node dimensions for children percentage resolution
  const nodeWidth = node.w || parentWidth;
  const nodeHeight = node.h || parentHeight;
  
  // Process children recursively
  if (Array.isArray(element.props.children)) {
    element.props.children.forEach(child => {
      if (child && typeof child === 'object' && 'type' in child) {
        const childNode = buildFlexTree(child, node, nodeWidth, nodeHeight);
        node.addChild(childNode);
      }
    });
  }
  
  return node;
}

/**
 * Computes layout and applies results back to element tree
 */
export function computeLayout(element: JSX.Element, containerWidth: number = 512, containerHeight: number = 512): JSX.Element {
  // Build FlexTarget tree
  const flexRoot = buildFlexTree(element, undefined, containerWidth, containerHeight);
  
  // Calculate layout
  flexRoot.update();
  
  // Apply computed positions back to elements (as numbers now)
  applyLayoutToElements(element, flexRoot);
  
  return element;
}

function applyLayoutToElements(element: JSX.Element, flexNode: FlexTarget): void {
  // Set computed layout as number values (no longer Percent)
  // These will be serialized to the fixed-width protocol
  element.props.x = flexNode.getLayoutX();
  element.props.y = flexNode.getLayoutY();
  element.props.width = flexNode.getLayoutW();
  element.props.height = flexNode.getLayoutH();
  
  // Process children
  if (Array.isArray(element.props.children)) {
    const children = flexNode.getChildren();
    element.props.children.forEach((child, index) => {
      if (child && typeof child === 'object' && 'type' in child) {
        applyLayoutToElements(child, children[index]);
      }
    });
  }
}
```

### 5. Integration Point

**File:** `src/core/render/tree.ts`

```typescript
export function buildTree(element: JSX.Element, player: Player): JSX.Element {
  // Phase 1: Expand components and contexts
  const expanded = expandAndResolveContexts(element, context, player);
  
  // 🆕 Phase 2: Compute layout (NEW!)
  const layouted = computeLayout(expanded);
  
  // Phase 3: Apply inheritance
  const final = applyInheritance(layouted);
  
  return final;
}
```

### 6. Component Usage Example

```tsx
// Before (manual positioning - NO LONGER SUPPORTED)
// ❌ <Panel x={10} y={20} width={300} height={200}>
// ❌   <Text x={0} y={0}>Title</Text>
// ❌   <Text x={0} y={30}>Content</Text>
// ❌ </Panel>

// After (automatic layout with Percent types)
<Panel display="flex" flexDirection="column" gap={10} padding={20} width={300}>
  <Text>Title</Text>
  <Text>Content</Text>
</Panel>

// With percentage sizes
<Panel display="flex" width="100%" height="50%">
  <Text flexGrow={1}>Left side</Text>
  <Text flexGrow={1}>Right side</Text>
</Panel>

// With margin/padding variants
<Panel 
  display="flex" 
  padding={{ top: 10, right: 20, bottom: 10, left: 20 }}
>
  <Text margin={{ right: "10%" }}>Spaced text</Text>
</Panel>
```

### 7. Migration Strategy

**Breaking Change:** Manual positioning (x, y props) is completely removed

**Migration path:**
1. All existing components must use `display="flex"` or `display="block"`
2. Replace manual x/y with flex properties:
   - `x={10}` → `margin={{ left: 10 }}`
   - `y={20}` → `margin={{ top: 20 }}`
   - Absolute positioning → use flex with `position: 'absolute'` (future feature)
3. Update all numeric size values to Percent type:
   - `width={300}` → `width={300}` (still works, number = pixels)
   - New: `width="50%"` → half of parent width

### 8. Testing Strategy

1. ✅ Verify flexbox.js bundles correctly (DONE)
2. Test basic flex layouts (row, column)
3. Test nested flex containers
4. Test mixed manual + flex positioning
5. Verify serialization still works
6. Test in-game rendering

### 9. Future Enhancements

- Grid layout support
- Percentage-based sizes (`funcW`, `funcH` from flexbox.js)
- Responsive breakpoints
- Animation/transition support for layout changes

## Questions for Validation

1. ~~Should layout computation happen on every render or cache results?~~ → Every render (forms are ephemeral)
2. ~~How to handle dynamic content (text wrapping, variable children)?~~ → Use fit-to-contents (width/height = 0 or undefined)
3. ~~Should we allow mixing manual positioning with flex?~~ → **NO - manual positioning removed entirely**
4. Performance impact of layout calculation per-frame? → Monitor, optimize if needed
5. Should we support `display="block"`? → Start with flex only, add block later if needed
6. Default container size for root element? → Use Minecraft form dimensions (512x512 or configurable)

import type { ComputedLayout, FlexStyle, LayoutNode } from './types';

function zeroLayout(): ComputedLayout {
  return { x: 0, y: 0, width: 0, height: 0, zIndex: 0 };
}

/**
 * Create a layout node with an optional style and children.
 * The `layout` field is zeroed and will be filled by `computeLayout()`.
 */
export function createNode(style: FlexStyle = {}, children: LayoutNode[] = []): LayoutNode {
  return { style, children, layout: zeroLayout() };
}

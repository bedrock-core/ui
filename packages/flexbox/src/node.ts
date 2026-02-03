import type { FlexStyle, ComputedLayout, FlexDirection } from './types.js';
import { DEFAULT_STYLE } from './types.js';

/**
 * FlexNode represents a node in the flex layout tree.
 * Each node can be both a flex container and a flex item.
 */
export class FlexNode {
  private static _idCounter = 0;

  public id: string;
  public style: FlexStyle;
  public children: FlexNode[] = [];
  public parent: FlexNode | null = null;
  public layout: ComputedLayout = { x: 0, y: 0, width: 0, height: 0 };

  constructor(style: FlexStyle = {}, id?: string) {
    this.id = id ?? `node_${FlexNode._idCounter++}`;
    this.style = style;
  }

  /**
     * Add a child node
     */
  addChild(child: FlexNode): this {
    child.parent = this;
    this.children.push(child);

    return this;
  }

  /**
     * Add multiple children
     */
  addChildren(...children: FlexNode[]): this {
    for (const child of children) {
      this.addChild(child);
    }

    return this;
  }

  /**
     * Remove a child node
     */
  removeChild(child: FlexNode): boolean {
    const index = this.children.indexOf(child);

    if (index !== -1) {
      child.parent = null;
      this.children.splice(index, 1);

      return true;
    }

    return false;
  }

  /**
     * Get resolved style value with defaults
     */
  getStyle<K extends keyof FlexStyle>(key: K): NonNullable<FlexStyle[K]> {
    return (this.style[key] ?? DEFAULT_STYLE[key]);
  }

  /**
     * Check if this is the root node
     */
  isRoot(): boolean {
    return this.parent === null;
  }

  /**
     * Get the flex direction
     */
  get flexDirection(): FlexDirection | undefined {
    return this.getStyle('flexDirection');
  }

  /**
     * Check if main axis is horizontal
     */
  isRowDirection(): boolean {
    const dir = this.flexDirection;

    return dir === 'row' || dir === 'row-reverse';
  }

  /**
     * Check if main axis is reversed
     */
  isReversed(): boolean {
    const dir = this.flexDirection;

    return dir === 'row-reverse' || dir === 'column-reverse';
  }

  /**
     * Get gap for main axis
     */
  getMainGap(): number {
    const gap = this.getStyle('gap');

    if (this.isRowDirection()) {
      return this.style.columnGap ?? gap;
    }

    return this.style.rowGap ?? gap;
  }

  /**
     * Get gap for cross axis
     */
  getCrossGap(): number {
    const gap = this.getStyle('gap');

    if (this.isRowDirection()) {
      return this.style.rowGap ?? gap;
    }

    return this.style.columnGap ?? gap;
  }

  /**
     * Get resolved padding values
     */
  getPadding(): { top: number; right: number; bottom: number; left: number } {
    const p = this.getStyle('padding');

    return {
      top: this.style.paddingTop ?? p,
      right: this.style.paddingRight ?? p,
      bottom: this.style.paddingBottom ?? p,
      left: this.style.paddingLeft ?? p,
    };
  }

  /**
     * Get resolved margin values
     */
  getMargin(): { top: number; right: number; bottom: number; left: number } {
    const m = this.getStyle('margin');

    return {
      top: this.style.marginTop ?? m,
      right: this.style.marginRight ?? m,
      bottom: this.style.marginBottom ?? m,
      left: this.style.marginLeft ?? m,
    };
  }
}

/**
 * Create a new FlexNode with the given style
 */
export function createNode(style: FlexStyle = {}, id?: string): FlexNode {
  return new FlexNode(style, id);
}

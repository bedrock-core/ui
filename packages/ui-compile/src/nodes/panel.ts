import { PANEL_TYPE } from '@bedrock-core/ui-runtime/compile';
import { backgroundOf, FULL, layerOf, offsetOf, sizeOf, str, topLeft, visibilityOf } from './shared';
import { stackRows } from './stack';
import type { IrNode, NodeBase, NodeDefinition } from './types';

/** A container. Draws its background, if it has one, behind its children. */
export interface PanelNode extends NodeBase {
  kind: 'panel';
  /** Nineslice texture drawn over the whole rect, under the children. */
  background?: string;
  /**
   * Emitted as a stack rather than a box: a child folds (a disclosure), and a
   * stack is what gives its hidden rows no space so the children after it
   * move up. Set by the lowering from what the children are.
   */
  stack?: true;
  children: IrNode[];
}

declare module './types' {
  interface IrNodeMap {
    panel: PanelNode;
  }
}

export const panelDefinition: NodeDefinition<PanelNode> = {
  kind: 'panel',
  types: [PANEL_TYPE],

  lower(element, _type, ctx): PanelNode {
    const background = str(element.props.background);
    // Children are relative to THIS panel, not to the grandparent.
    const children = ctx.children(element, ctx.own);
    const folds = children.some(child => child.kind === 'disclosure');

    if (folds && background !== '') {
      throw new Error(
        'A panel holding a <Disclosure> is drawn as a stack so the fold can reflow the rows '
        + 'below it, and a stack has no room for a background. Put the background on a panel around it.',
      );
    }

    return {
      kind: 'panel',
      name: ctx.name('panel'),
      rect: ctx.rect,
      ...ctx.decoration,
      ...background === '' ? {} : { background },
      ...folds ? { stack: true as const } : {},
      children,
    };
  },

  children: node => node.children,

  face(node, ctx) {
    if (node.stack === true) {
      return {
        [node.name]: {
          type: 'stack_panel',
          orientation: 'vertical',
          size: [node.rect.width, '100%c'],
          ...layerOf(node),
          ...visibilityOf(node),
          offset: offsetOf(node.rect),
          ...topLeft,
          controls: stackRows(node.children, node.rect.width, ctx),
        },
      };
    }

    const children = node.children.map(child => ctx.emitNode(child));
    const background = backgroundOf(node);

    return {
      [node.name]: {
        type: 'panel',
        size: sizeOf(node.rect),
        ...layerOf(node),
        ...visibilityOf(node),
        offset: offsetOf(node.rect),
        ...topLeft,
        // Children one layer above the background, never beside it: at an
        // equal layer the client resolves the order per draw, and inside a
        // clipped scroll region a card's text came and went with the scroll
        // position. A layer is relative to its parent, so nesting keeps
        // climbing — every descendant stays above every ancestor's background.
        controls: background.length === 0
          ? children
          : [
              ...background,
              { content: { type: 'panel', size: FULL, ...topLeft, layer: 1, controls: children } },
            ],
      },
    };
  },
};

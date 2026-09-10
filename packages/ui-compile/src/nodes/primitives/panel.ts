import { PANEL_TYPE } from '@bedrock-core/ui-runtime/compile';
import { panelFace } from '../../faces';
import { boxOf, collapses, layerOf, offsetOf, str, topLeft, visibilityOf } from '../utils/shared';
import { stackRows } from '../utils/stack';
import type { IrNode, NodeBase, NodeDefinition } from '../utils/types';

/** A container. Draws its background, if it has one, behind its children. */
export interface PanelNode extends NodeBase {
  kind: 'panel';
  /** Nineslice texture drawn over the whole rect, under the children. */
  background?: string;
  /**
   * Emitted as a stack rather than a box, so a child that folds away gives up
   * its space and the children after it move up. Declared by the composition
   * that folds, and inherited by every panel holding one.
   */
  stack?: true;
  children: IrNode[];
}

declare module '../utils/types' {
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
    const folds = element.props.stack === true || children.some(collapses);

    if (folds && background !== '') {
      throw new Error(
        'A panel holding a fold is drawn as a stack so the fold can reflow the rows below it, '
        + 'and a stack has no room for a background. Put the background on a panel around it.',
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

    return panelFace({
      ...boxOf(node),
      ...node.background === undefined ? {} : { background: node.background },
      children: node.children.map(child => ctx.emitNode(child)),
    });
  },
};

import type { JSX } from '@bedrock-core/ui-runtime';
import { PANEL_TYPE } from '@bedrock-core/ui-runtime/compile';
import { panelFace } from '../../faces';
import { boxOf, collapses, layerOf, offsetOf, sizeOf, str, topLeft, visibilityOf } from '../utils/shared';
import { stackColumns, stackRows } from '../utils/stack';
import type { IrNode, NodeBase, NodeDefinition } from '../utils/types';

/** The flex props the layout parked on the element, as the stack reads them. */
const layoutOf = (props: JSX.Props): { row: boolean; centred: boolean } => {
  const layout = props.__layout;

  if (typeof layout !== 'object' || layout === null) {
    return { row: false, centred: false };
  }

  return {
    row: 'flexDirection' in layout && layout.flexDirection === 'row',
    centred: 'justifyContent' in layout && layout.justifyContent === 'center',
  };
};

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
  /** A stack along the row, from the panel's own `flexDirection`. */
  row?: true;
  /**
   * The stack hangs from the middle of the box the layout gave it rather than
   * from its left, from the panel's own `justifyContent`. What centres a row
   * whose width is only known once the strings in it arrive.
   */
  centred?: true;
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
    const { row, centred } = layoutOf(element.props);

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
      ...folds && row ? { row: true as const } : {},
      ...folds && row && centred ? { centred: true as const } : {},
      children,
    };
  },

  children: node => node.children,

  face(node, ctx) {
    if (node.stack === true && node.row === true) {
      // The stack is as wide as what it holds, so it cannot also be the box the
      // layout placed: the box stays, and the stack hangs inside it.
      return {
        [node.name]: {
          type: 'panel',
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...topLeft,
          ...layerOf(node),
          ...visibilityOf(node),
          controls: [{
            [`${node.name}_row`]: {
              type: 'stack_panel',
              orientation: 'horizontal',
              size: ['100%c', node.rect.height],
              ...node.centred === true
                ? { anchor_from: 'center', anchor_to: 'center' }
                : topLeft,
              controls: stackColumns(node.children, node.rect.height, node.centred === true, ctx),
            },
          }],
        },
      };
    }

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

import { PANEL_TYPE } from '@bedrock-core/ui-runtime/compile';
import { backgroundOf, layerOf, offsetOf, sizeOf, str, topLeft, visibilityOf } from './shared';
import type { IrNode, NodeBase, NodeDefinition } from './types';

/** A container. Draws its background, if it has one, behind its children. */
export interface PanelNode extends NodeBase {
  kind: 'panel';
  /** Nineslice texture drawn over the whole rect, under the children. */
  background?: string;
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

    return {
      kind: 'panel',
      name: ctx.name('panel'),
      rect: ctx.rect,
      ...ctx.decoration,
      ...background === '' ? {} : { background },
      // Children are relative to THIS panel, not to the grandparent.
      children: ctx.children(element, ctx.own),
    };
  },

  children: node => node.children,

  emit(node, ctx) {
    return {
      [node.name]: {
        type: 'panel',
        size: sizeOf(node.rect),
        ...layerOf(node),
        ...visibilityOf(node),
        offset: offsetOf(node.rect),
        ...topLeft,
        controls: [
          ...backgroundOf(node),
          ...node.children.map(child => ctx.emitNode(child)),
        ],
      },
    };
  },
};

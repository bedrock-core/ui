import { EMBED_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import { embedFace } from '../../faces';
import type { ControlEntry } from '../../jsonui';
import { boxOf } from '../utils/shared';
import type { NodeBase, NodeDefinition } from '../utils/types';

/**
 * One entry reserved for a screen another pack draws: the host compiles no
 * control for it — the pack that holds the embedded screen bakes the control
 * that reads it — so the node is the address and nothing else. It is met
 * here so the host's cell numbering counts it, which is what keeps the
 * embedded screen's entries where its build put them.
 */
export interface EmbedNode extends NodeBase {
  kind: 'embed';
  address: number;
}

declare module '../utils/types' {
  interface IrNodeMap {
    embed: EmbedNode;
  }
}

export const embedDefinition: NodeDefinition<EmbedNode> = {
  kind: 'embed',
  types: [EMBED_SLOT_TYPE],

  lower(element, _type, ctx): EmbedNode {
    return {
      kind: 'embed',
      name: ctx.name('embed'),
      rect: ctx.rect,
      address: ctx.cellOf(element).address,
    };
  },

  face(node): ControlEntry {
    return embedFace(boxOf(node));
  },
};

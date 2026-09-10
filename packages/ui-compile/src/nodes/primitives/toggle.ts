import { MODAL_TOGGLE_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import { toggleFace } from '../../faces';
import type { ControlEntry } from '../../jsonui';
import { type FieldBase, scaleOf, toggleMount } from '../utils/fields';
import { boxOf } from '../utils/shared';
import type { NodeDefinition } from '../utils/types';

/**
 * A switch the engine owns: two textures and which one the build rendered.
 *
 * The look is all this node has. What makes it answerable — the row it reports
 * on, the widget the engine puts there — belongs to the screen, which is why
 * the modal is the only host that has a mechanism for it.
 */
export interface ToggleNode extends FieldBase {
  kind: 'toggle';
  /** The eight state textures, as the variables the mounted toggle reads. */
  mount: Record<string, string>;
  /** The texture while off; the resting look. */
  off: string;
  /** The texture while on, which is the off one when the author gave only that. */
  on: string;
  /** Which way the build rendered it. The engine owns it once the screen is open. */
  checked: boolean;
}

declare module '../utils/types' {
  interface IrNodeMap {
    toggle: ToggleNode;
  }
}

export const toggleDefinition: NodeDefinition<ToggleNode> = {
  kind: 'toggle',
  types: [MODAL_TOGGLE_SLOT_TYPE],

  lower(element, _type, ctx): ToggleNode {
    const mount = toggleMount(element.props);

    return {
      kind: 'toggle',
      name: ctx.name('field'),
      rect: ctx.rect,
      ...ctx.decoration,
      address: ctx.cellOf(element).address,
      mount,
      scale: scaleOf(element.props),
      off: mount['$off'] ?? '',
      on: mount['$on'] ?? '',
      checked: element.nativeArgs?.['defaultValue'] === true,
    };
  },

  socket: () => 'field',

  face(node): ControlEntry {
    return toggleFace({ ...boxOf(node), off: node.off, on: node.on, checked: node.checked });
  },
};

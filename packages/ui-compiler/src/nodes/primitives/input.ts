import { MODAL_INPUT_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import { inputFace } from '../../faces';
import type { ControlEntry } from '../../jsonui';
import { backgroundOf, type FieldBase, scaleOf, surfaceMount } from '../utils/fields';
import { boxOf, str } from '../utils/shared';
import type { NodeDefinition } from '../utils/types';

/**
 * A box of text the engine owns while the screen is open.
 *
 * Two strings, because an empty box draws its placeholder and a filled one
 * draws its value: the face needs both to draw whichever the build was in.
 */
export interface InputNode extends FieldBase {
  kind: 'input';
  /** The box's surface, as the variable the mounted input reads. */
  mount: Record<string, string>;
  /** The box's own texture; absent leaves the face's blank canvas. */
  background?: string;
  /** What the build rendered with. The engine owns it from the first keystroke. */
  text: string;
  /** What is drawn instead while the value is empty. */
  placeholder: string;
}

declare module '../utils/types' {
  interface IrNodeMap {
    input: InputNode;
  }
}

export const inputDefinition: NodeDefinition<InputNode> = {
  kind: 'input',
  types: [MODAL_INPUT_SLOT_TYPE],

  lower(element, _type, ctx): InputNode {
    return {
      kind: 'input',
      name: ctx.name('field'),
      rect: ctx.rect,
      ...ctx.decoration,
      address: ctx.cellOf(element).address,
      mount: surfaceMount(element.props),
      scale: scaleOf(element.props),
      ...backgroundOf(element.props),
      text: str(element.nativeArgs?.['defaultValue']),
      placeholder: str(element.nativeArgs?.['placeholder']),
    };
  },

  socket: () => 'field',

  face(node): ControlEntry {
    return inputFace({
      ...boxOf(node),
      ...node.background === undefined ? {} : { background: node.background },
      text: node.text,
      placeholder: node.placeholder,
      style: { fontScaleFactor: node.scale },
    });
  },
};

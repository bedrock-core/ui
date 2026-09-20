import { childElements, MODAL_DROPDOWN_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import type { JSX } from '@bedrock-core/ui-runtime';
import { dropdownFace } from '../../faces';
import type { ControlEntry } from '../../jsonui';
import { backgroundOf, dropdownMount, type FieldBase, scaleOf } from '../utils/fields';
import { boxOf, num, str } from '../utils/shared';
import type { NodeDefinition } from '../utils/types';

/**
 * A closed chooser: the current option's label, and the list the engine opens.
 *
 * Only the closed state is a face. The open list is drawn by the engine in a
 * popup of its own, which is why the popup travels beside the face rather than
 * in it — see {@link DropdownNode.popup}.
 */
export interface DropdownNode extends FieldBase {
  kind: 'dropdown';
  /** The closed box's surface and the popup's, as the mounted dropdown reads them. */
  mount: Record<string, string>;
  /** The closed box's texture; absent leaves the face's blank canvas. */
  background?: string;
  /** The label of the option the build started on. */
  text: string;
  /**
   * The popup, baked for the OVERLAY the host emits at the screen root.
   *
   * It cannot ride this cell: the list has to draw over the whole screen, and
   * mounting it inside the native dropdown's own subtree took the client down
   * — names in there are the engine's to resolve.
   */
  popup: { texture: string; height: number };
}

declare module '../utils/types' {
  interface IrNodeMap {
    dropdown: DropdownNode;
  }
}

/** The label of the option a chooser starts on; the value itself when no option carries it. */
export const currentOptionLabel = (element: JSX.Element): string => {
  const value = str(element.nativeArgs?.['defaultValue']);
  const options = childElements(element.props.children);
  const current = options.find(option => str(option.props.value) === value) ?? options[0];

  return current === undefined ? value : str(current.props.label, value);
};

export const dropdownDefinition: NodeDefinition<DropdownNode> = {
  kind: 'dropdown',
  types: [MODAL_DROPDOWN_SLOT_TYPE],

  lower(element, _type, ctx): DropdownNode {
    return {
      kind: 'dropdown',
      name: ctx.name('field'),
      rect: ctx.rect,
      ...ctx.decoration,
      address: ctx.cellOf(element).address,
      enabled: element.props.enabled !== false,
      mount: dropdownMount(element.props),
      scale: scaleOf(element.props),
      ...backgroundOf(element.props),
      text: currentOptionLabel(element),
      // `popupHeight` is `Dropdown`'s own computation (rows x 17 + the fused
      // border + padding), baked as given.
      popup: { texture: str(element.props.popupBackground), height: num(element.props.popupHeight, 20) },
    };
  },

  socket: () => 'field',

  face(node): ControlEntry {
    return dropdownFace({
      ...boxOf(node),
      ...node.background === undefined ? {} : { background: node.background },
      text: node.text,
      style: { fontScaleFactor: node.scale },
    });
  },
};

import type { ButtonMapping, ControlEntry } from '../jsonui';
import { type ButtonFace, shareButtonFaces } from './button';
import { layerOf, offsetOf, sizeOf, topLeft, visibilityOf } from './shared';
import type { IrNode, NodeBase, NodeDefinition } from './types';

/**
 * The screen's close button: drawn like a button, but the press is the
 * client's — it closes the screen the way vanilla's own X does — so it has no
 * slot and the runtime never hears it. Its children are baked into the face
 * like any button's. The same on every host, so it is a look with no socket.
 */
export interface ExitNode extends NodeBase {
  kind: 'exit';
  face: ButtonFace;
  children: IrNode[];
}

declare module './types' {
  interface IrNodeMap {
    exit: ExitNode;
  }
}

/**
 * Vanilla's close button routes: a press closes the screen on the client, and
 * the server hears it as the container closing.
 */
const EXIT_MAPPINGS: ButtonMapping[] = [
  { from_button_id: 'button.menu_select', to_button_id: 'button.menu_exit', mapping_type: 'pressed' },
  { from_button_id: 'button.menu_ok', to_button_id: 'button.menu_exit', mapping_type: 'pressed' },
];

/**
 * Lowered by the button kind: whether a `<Button>` is the screen's close
 * button is its `onPress`, which only that lowering sees.
 */
export const exitDefinition: NodeDefinition<ExitNode> = {
  kind: 'exit',

  children: node => node.children,

  face(node, ctx): ControlEntry {
    const faces = shareButtonFaces(node, ctx);

    // A real JSON UI button rather than a slot: the exit route is the
    // engine's, so no transaction and no transport are involved. A button
    // draws the child its `*_control` names and nothing else of its own, so
    // every state is one of the shared faces, caption included.
    return {
      [node.name]: {
        type: 'button',
        size: sizeOf(node.rect),
        offset: offsetOf(node.rect),
        ...topLeft,
        ...layerOf(node),
        ...visibilityOf(node),
        default_control: 'default',
        hover_control: 'hover',
        pressed_control: 'pressed',
        button_mappings: EXIT_MAPPINGS,
        controls: [
          { [`default@${faces.rest}`]: {} },
          { [`hover@${faces.hover}`]: {} },
          { [`pressed@${faces.pressed}`]: {} },
        ],
      },
    };
  },
};

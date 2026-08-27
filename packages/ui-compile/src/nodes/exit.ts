import type { ButtonMapping, ControlEntry } from '../jsonui';
import type { ButtonFace } from './button';
import { FACE_CONTENT_LAYER, FULL, layerOf, offsetOf, sizeOf, topLeft, visibilityOf } from './shared';
import type { IrNode, NodeBase, NodeDefinition } from './types';

/**
 * The screen's close button: drawn like a button, but the press is the
 * client's — it closes the screen the way vanilla's own X does — so it has no
 * slot and the runtime never hears it. Its children are baked into the face
 * like any button's.
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

  emit(node, ctx): ControlEntry {
    // A real JSON UI button rather than a slot: the exit route is the
    // engine's, so no transaction and no transport are involved.
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
          { default: { type: 'image', texture: node.face.texture, size: FULL, keep_ratio: false } },
          { hover: { type: 'image', texture: node.face.hover, size: FULL, keep_ratio: false } },
          { pressed: { type: 'image', texture: node.face.pressed, size: FULL, keep_ratio: false } },
          ...node.children.length === 0
            ? []
            : [{
              content: {
                type: 'panel' as const,
                size: FULL,
                ...topLeft,
                layer: FACE_CONTENT_LAYER,
                controls: node.children.map(child => ctx.emitNode(child)),
              },
            } satisfies ControlEntry],
        ],
      },
    };
  },
};

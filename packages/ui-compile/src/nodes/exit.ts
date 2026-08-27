import type { ButtonMapping, Control, ControlEntry } from '../jsonui';
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

/** One state: the texture, and whatever the author put on it. */
const face = (texture: string, content: string | undefined): Control => ({
  type: 'panel',
  size: FULL,
  ...topLeft,
  controls: [
    { bg: { type: 'image', texture, size: FULL, keep_ratio: false, layer: 1 } },
    ...content === undefined ? [] : [{ [`caption@${content}`]: {} } satisfies ControlEntry],
  ],
});

/**
 * Lowered by the button kind: whether a `<Button>` is the screen's close
 * button is its `onPress`, which only that lowering sees.
 */
export const exitDefinition: NodeDefinition<ExitNode> = {
  kind: 'exit',

  children: node => node.children,

  emit(node, ctx): ControlEntry {
    // A caption goes INSIDE each state, never beside them: a button draws the
    // child its `*_control` names and nothing else of its own, so a sibling of
    // the states is never seen. Emitted once and referenced by each face —
    // usually there is nothing to emit, since a close button is a texture.
    const content = node.children.length === 0 ? undefined : `${ctx.ns}.${node.name}_content`;

    if (content !== undefined) {
      ctx.defs[`${node.name}_content`] = {
        type: 'panel',
        size: FULL,
        ...topLeft,
        layer: FACE_CONTENT_LAYER,
        controls: node.children.map(child => ctx.emitNode(child)),
      };
    }

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
          { default: face(node.face.texture, content) },
          { hover: face(node.face.hover, content) },
          { pressed: face(node.face.pressed, content) },
        ],
      },
    };
  },
};

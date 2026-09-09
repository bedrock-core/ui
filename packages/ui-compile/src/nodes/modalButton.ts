import { MODAL_FORM_BUTTON_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import type { ButtonMapping, Control, ControlEntry } from '../jsonui';
import { type ButtonFace, faceOf } from './button';
import {
  FACE_CONTENT_LAYER, faceId, FULL, layerOf, offsetOf, shareFace, sizeOf, str, topLeft, visibilityOf,
} from './shared';
import type { FaceEmit, NodeBase, NodeDefinition } from './types';

/**
 * A modal's submit or exit button, drawn by the pack.
 *
 * Unlike every other control in a `<Form>`, these two are NOT native: a
 * `ModalFormData` has no button of its own to place, takes no `formValues`
 * slot for them, and the engine will not draw them. The interpreter already
 * draws them itself, decoding their geometry out of the title; a compiled
 * screen draws them from its own definition and sends nothing.
 *
 * So this is an ordinary compiled button whose press is routed to the modal's
 * own action. Nothing about it reaches script directly — the engine turns the
 * press into the submit or the dismissal, and the runtime hears it as the
 * `formValues` response or as a cancel. The route is the client's, so the
 * node is a look with no socket.
 */
export interface ModalButtonNode extends NodeBase {
  kind: 'modal_button';
  /** Which of the two this is. A form declares one submit and at most one exit. */
  role: 'submit' | 'exit';
  face: ButtonFace;
  /** The caption. A `Form.Button` carries its text as a prop, not as children. */
  label: string;
}

declare module './types' {
  interface IrNodeMap {
    modal_button: ModalButtonNode;
  }
}

/**
 * What the engine calls each press.
 *
 * `button.submit_custom_form` is the modal's own submit — the same action the
 * interpreter's `flow_button` routes to, which is where this name comes from
 * rather than from guesswork. Exit is vanilla's close, the same one a
 * `useExit()` button uses on any other screen.
 */
const ACTIONS = {
  submit: 'button.submit_custom_form',
  exit: 'button.menu_exit',
} as const;

const mappingsFor = (role: 'submit' | 'exit'): ButtonMapping[] => [
  // Copied from the interpreter's own `flow_button_inner`, mapping types
  // included: `menu_ok` is FOCUSED there, not pressed. Matching a shape that is
  // known to work beats a shape that looks reasonable.
  { from_button_id: 'button.menu_select', to_button_id: ACTIONS[role], mapping_type: 'pressed' },
  { from_button_id: 'button.menu_ok', to_button_id: ACTIONS[role], mapping_type: 'focused' },
];

/**
 * One state: the texture, and the caption over it.
 *
 * The caption goes INSIDE each state, never beside them — a button draws the
 * child its `*_control` names and nothing else of its own, so a sibling of the
 * state controls is never seen.
 */
const stateFace = (texture: string, content: string | undefined): Control => ({
  type: 'panel',
  size: FULL,
  ...topLeft,
  controls: [
    { bg: { type: 'image', texture, size: FULL, keep_ratio: false, layer: 1 } },
    ...content === undefined
      ? []
      : [{ [`caption@${content}`]: { layer: FACE_CONTENT_LAYER } } satisfies ControlEntry],
  ],
});

/**
 * The caption, centred on the face in BOTH axes.
 *
 * A label sized to the whole button draws its text at the top of that box, so
 * centring the box changes nothing — the text still sits at the top edge.
 * Sizing the label to its own content (`default` height) and anchoring THAT
 * to the centre is what puts the text in the middle; `text_alignment` then
 * handles the horizontal within it.
 */
const caption = (label: string): Control => ({
  type: 'label',
  size: ['100%', 'default'],
  anchor_from: 'center',
  anchor_to: 'center',
  text_alignment: 'center',
  text: label,
  localize: false,
});

/** The three shared faces one captioned button look has, fully qualified. */
const shareFaces = (node: ModalButtonNode, ctx: FaceEmit): { rest: string; hover: string; pressed: string } => {
  const id = faceId('modal_button', JSON.stringify({ face: node.face, size: sizeOf(node.rect), label: node.label }));
  const { faces, facesNs } = ctx;
  const content = node.label === '' ? undefined : `${facesNs}.${id}_content`;

  if (content !== undefined) {
    shareFace(faces, `${id}_content`, caption(node.label));
  }

  return {
    rest: `${facesNs}.${shareFace(faces, id, stateFace(node.face.texture, content))}`,
    hover: `${facesNs}.${shareFace(faces, `${id}_hover`, stateFace(node.face.hover, content))}`,
    pressed: `${facesNs}.${shareFace(faces, `${id}_pressed`, stateFace(node.face.pressed, content))}`,
  };
};

export const modalButtonDefinition: NodeDefinition<ModalButtonNode> = {
  kind: 'modal_button',
  types: [MODAL_FORM_BUTTON_SLOT_TYPE],

  lower(element, _type, ctx): ModalButtonNode {
    return {
      kind: 'modal_button',
      name: ctx.name('modal_button'),
      rect: ctx.rect,
      ...ctx.decoration,
      // `buttonKind`, not `type`: the element's `type` is the JSX host type.
      role: str(element.props.buttonKind) === 'exit' ? 'exit' : 'submit',
      face: faceOf(element.props),
      label: str(element.props.label) ?? '',
    };
  },

  face(node, ctx): ControlEntry {
    const faces = shareFaces(node, ctx);

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
        sound_name: 'random.click',
        sound_volume: 1,
        sound_pitch: 1,
        button_mappings: mappingsFor(node.role),
        controls: [
          { [`default@${faces.rest}`]: {} },
          { [`hover@${faces.hover}`]: {} },
          { [`pressed@${faces.pressed}`]: {} },
        ],
      },
    };
  },
};

import type { JSX } from '@bedrock-core/ui-runtime';
import { BUTTON_TYPE, isExitButton, MODAL_FORM_BUTTON_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import { FULL, panelFace, stateFace, topLeft } from '../../faces';
import type { ButtonMapping, Control } from '../../jsonui';
import { shapeOf } from '../index';
import { boxOf, entryControl, faceId, shareFace, sizeOf, str } from '../utils/shared';
import type { FaceEmit, IrNode, NodeBase, NodeDefinition, Rect } from '../utils/types';

/**
 * What a button looks like in each state. The look is the same on every host;
 * only what a press IS differs, and that is the host's ([10-faces-and-hosts](../../../docs/10-faces-and-hosts.md)).
 */
export interface ButtonFace {
  texture: string;
  hover: string;
  pressed: string;
  /**
   * Drawn instead of `texture` while the button is disabled. Optional: a
   * button without one keeps its resting face when disabled, and only stops
   * reacting.
   */
  disabled?: string;
}

/**
 * A button, with its children baked into the face.
 *
 * The children were laid out by the flex engine like everything else, so they
 * are ordinary nodes positioned relative to the button's rect. Live text is not
 * among them: a face is a shared definition, and a channel index is not.
 */
export interface ButtonNode extends NodeBase {
  kind: 'button';
  /**
   * Where the host put this button's cell. A container index on a chest, an
   * entry on a form. Absent on a button that only closes the screen: that
   * press is the client's, so the screen spends nothing on it.
   */
  address?: number;
  /**
   * The engine action this press is routed to, when it has one.
   *
   * Absent means the press is UNDETERMINED at build: script decides what it
   * does, so the screen spends a cell or an entry on it and the runtime hears
   * it. Present means the compile already knows — close the screen, submit the
   * form — so the engine routes it and nothing reaches script directly.
   *
   * Not a kind of its own either way. An action is something a button is
   * GIVEN, not a different sort of control.
   */
  action?: ButtonAction;
  /**
   * The caption a button carries as a prop rather than as children.
   *
   * A `<Button>` captions itself with what is inside it, laid out by the
   * flexbox like any child. A form's submit takes a string instead, because on
   * the interpreted path that string rides the title payload — until the two
   * become one component and this goes.
   */
  label?: string;
  face: ButtonFace;
  children: IrNode[];
}

/**
 * An action the engine performs itself, so script never hears the press.
 *
 * Three, not two, because closing a screen and dismissing a modal are reached
 * DIFFERENTLY even though they send the same action: a screen's close button
 * is vanilla's own, and a modal's pair are the interpreter's `flow_button`.
 * Both shapes are copied from something that works rather than reasoned about,
 * so both are kept exactly.
 */
export type ButtonAction = 'close' | 'submit' | 'dismiss';

declare module '../utils/types' {
  interface IrNodeMap {
    button: ButtonNode;
  }
}

/**
 * What a built `<Button>` looks like. The component resolves every state to a
 * concrete texture, so a missing state reads as the base one — which is also
 * why a disabled look is only kept when it differs from the resting face.
 */
export const faceOf = (props: JSX.Props): ButtonFace => {
  const texture = str(props.background);
  const locked = str(props.backgroundLocked);

  return {
    texture,
    hover: str(props.backgroundHover),
    pressed: str(props.backgroundPressed),
    ...locked === texture ? {} : { disabled: locked },
  };
};

/** What one button look is made of: its textures, its size, and what is baked into it. */
export interface FacedNode {
  face: ButtonFace;
  rect: Rect;
  children: IrNode[];
  /** A caption carried as a prop rather than as children; part of what makes a look distinct. */
  label?: string;
  /** Set when the engine routes the press, which is also when there is no disabled state to draw. */
  action?: ButtonAction;
}

/**
 * What lets two buttons share a definition: the same look, at the same size,
 * with the same things baked into the face.
 */
export const faceSignature = (node: FacedNode): string => (node.label !== undefined && node.label !== ''
  ? JSON.stringify({ face: node.face, size: sizeOf(node.rect), label: node.label })
  : JSON.stringify({ face: node.face, size: sizeOf(node.rect), children: node.children.map(shapeOf) }));

/** The shared definitions one button look has, fully qualified. */
export interface ButtonFaces {
  /** The face id: what the host names its mechanism definitions after. */
  id: string;
  rest: string;
  hover: string;
  pressed: string;
  /** Present only when the author gave a disabled texture. */
  disabled?: string;
}

/**
 * The entry a pressable button was given.
 *
 * Only a button that closes the screen has none, and that one declares no
 * press socket, so nothing that fills a press is ever handed one.
 */
export const pressAddress = (node: ButtonNode): number => node.address ?? 0;

/**
 * How each action is reached, verbatim from the source it was taken from.
 *
 * `close` is vanilla's own close button. `submit` and `dismiss` are the
 * interpreter's `flow_button_inner`, mapping types included: `menu_ok` is
 * FOCUSED there, not pressed, and the pair click where a screen's close is
 * silent. `button.submit_custom_form` is the modal's own submit, which is
 * where that name comes from rather than from guesswork.
 *
 * Matching a shape that is known to work beats a shape that looks reasonable,
 * which is why the two that both close a screen are not folded together.
 */
const ROUTES = {
  close: { to: 'button.menu_exit', held: 'pressed', clicks: false },
  submit: { to: 'button.submit_custom_form', held: 'focused', clicks: true },
  dismiss: { to: 'button.menu_exit', held: 'focused', clicks: true },
} as const satisfies Record<ButtonAction, { to: string; held: ButtonMapping['mapping_type']; clicks: boolean }>;

const mappingsFor = (action: ButtonAction): ButtonMapping[] => [
  { from_button_id: 'button.menu_select', to_button_id: ROUTES[action].to, mapping_type: 'pressed' },
  { from_button_id: 'button.menu_ok', to_button_id: ROUTES[action].to, mapping_type: ROUTES[action].held },
];

/**
 * The caption a labelled button draws, centred on the face in BOTH axes.
 *
 * A label sized to the whole button draws its text at the top of that box, so
 * centring the box changes nothing — the text still sits at the top edge.
 * Sizing the label to its own content and anchoring THAT to the centre is what
 * puts the text in the middle; `text_alignment` then handles the horizontal.
 */
const labelCaption = (label: string): Control => ({
  type: 'label',
  size: ['100%', 'default'],
  anchor_from: 'center',
  anchor_to: 'center',
  text_alignment: 'center',
  text: label,
  localize: false,
});

/** One state's look: the texture, with the shared caption definition over it. */
const look = (texture: string, content: string | undefined): Control =>
  stateFace(texture, content === undefined ? [] : [{ [`caption@${content}`]: {} }]);

/**
 * Registers a button look's faces with the addon and names them.
 *
 * One definition per state, plus one for the caption every state references,
 * so a caption is emitted once however many faces a button has. Named by the
 * look, so every screen of the addon that draws this button draws these.
 */
export const shareButtonFaces = (node: FacedNode, ctx: FaceEmit): ButtonFaces => {
  const labelled = node.label !== undefined && node.label !== '';
  const id = faceId(labelled ? 'modal_button' : 'button', faceSignature(node));
  const { faces, facesNs } = ctx;
  const content = labelled || node.children.length > 0 ? `${facesNs}.${id}_content` : undefined;

  if (content !== undefined) {
    shareFace(faces, `${id}_content`, labelled
      ? labelCaption(node.label ?? '')
      : {
          type: 'panel',
          size: FULL,
          ...topLeft,
          controls: ctx.shared(node.children),
        });
  }

  const { face } = node;
  const named = {
    id,
    rest: shareFace(faces, id, look(face.texture, content)),
    hover: shareFace(faces, `${id}_hover`, look(face.hover, content)),
    pressed: shareFace(faces, `${id}_pressed`, look(face.pressed, content)),
    // An engine-routed button is never disabled: nothing gates it, so a
    // fourth face would be a definition no control ever names.
    ...face.disabled === undefined || node.action !== undefined
      ? {}
      : { disabled: shareFace(faces, `${id}_disabled`, look(face.disabled, content)) },
  };

  return {
    ...named,
    rest: `${facesNs}.${named.rest}`,
    hover: `${facesNs}.${named.hover}`,
    pressed: `${facesNs}.${named.pressed}`,
    ...named.disabled === undefined ? {} : { disabled: `${facesNs}.${named.disabled}` },
  };
};

/**
 * Which engine action a button was written as, if any.
 *
 * A `Form.Button` says so in a prop; an ordinary `<Button>` says so by the
 * handler `useExit()` gave it, which only this lowering can see.
 */
const actionOf = (element: JSX.Element, type: string): ButtonAction | undefined => {
  if (type === MODAL_FORM_BUTTON_SLOT_TYPE) {
    // `buttonKind`, not `type`: the element's `type` is the JSX host type.
    return str(element.props.buttonKind) === 'exit' ? 'dismiss' : 'submit';
  }

  return isExitButton(element) ? 'close' : undefined;
};

export const buttonDefinition: NodeDefinition<ButtonNode> = {
  kind: 'button',
  types: [BUTTON_TYPE, MODAL_FORM_BUTTON_SLOT_TYPE],

  lower(element, type, ctx): ButtonNode {
    const { props } = element;
    const action = actionOf(element, type);

    return {
      kind: 'button',
      name: ctx.name(action ?? 'button'),
      rect: ctx.rect,
      ...ctx.decoration,
      // An action the engine performs needs nothing from the host; an
      // undetermined press needs a cell the runtime can hear.
      ...action === undefined ? { address: ctx.cellOf(element).address } : { action },
      ...typeof props.label === 'string' ? { label: props.label } : {},
      face: faceOf(props),
      // Baked into the face, relative to the button like any other child.
      children: ctx.children(element, ctx.own),
    };
  },

  children: node => node.children,

  // A press the screen has to report is a socket; a press the engine routes is
  // not, because the client performs it and script hears the result.
  socket: node => (node.action === undefined ? 'press' : undefined),

  face(node, ctx) {
    const faces = shareButtonFaces(node, ctx);

    if (node.action !== undefined) {
      // A real JSON UI button rather than a cell: the route is the engine's,
      // so no transaction and no transport are involved. A button draws the
      // child its `*_control` names and nothing else of its own, so every
      // state is one of the shared faces, caption included.
      return {
        [node.name]: {
          ...entryControl(panelFace({ ...boxOf(node), children: [] })),
          type: 'button',
          default_control: 'default',
          hover_control: 'hover',
          pressed_control: 'pressed',
          ...ROUTES[node.action].clicks ? { sound_name: 'random.click', sound_volume: 1, sound_pitch: 1 } : {},
          button_mappings: mappingsFor(node.action),
          controls: [
            { [`default@${faces.rest}`]: {} },
            { [`hover@${faces.hover}`]: {} },
            { [`pressed@${faces.pressed}`]: {} },
          ],
        },
      };
    }

    // At rest: the resting face at the button's place, a SHARED definition
    // referenced rather than drawn — every button that looks the same draws
    // the same one. A host stands its mechanism here and reaches the other
    // states through the same faces.
    return panelFace({ ...boxOf(node), children: [{ [`face@${faces.rest}`]: {} }] });
  },
};

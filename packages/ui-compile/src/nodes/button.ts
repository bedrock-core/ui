import type { JSX } from '@bedrock-core/ui-runtime';
import { BUTTON_TYPE, isExitButton } from '@bedrock-core/ui-runtime/compile';
import type { Control, ControlEntry } from '../jsonui';
import type { ExitNode } from './exit';
import { shapeOf } from './index';
import {
  FACE_CONTENT_LAYER, faceId, FULL, layerOf, offsetOf, shareFace, sizeOf, str, topLeft, visibilityOf,
} from './shared';
import type { FaceEmit, IrNode, NodeBase, NodeDefinition, Rect } from './types';

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
  /** Where the host put this button's cell. A container index on a chest, an entry on a form. */
  address: number;
  face: ButtonFace;
  children: IrNode[];
}

declare module './types' {
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
}

/**
 * What lets two buttons share a definition: the same look, at the same size,
 * with the same things baked into the face.
 */
export const faceSignature = (node: FacedNode): string => JSON.stringify({
  face: node.face,
  size: sizeOf(node.rect),
  children: node.children.map(shapeOf),
});

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
 * One state's face: the texture, and the caption over it.
 *
 * The caption goes INSIDE each state rather than beside them. A button shows
 * the child its `*_control` names and hides the others, so a sibling of the
 * state controls is not what gets drawn. And it is layered above the face
 * rather than merely after it: draw order among siblings at one layer is not
 * what decides this, and a caption at the default vanishes under the face.
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
 * Registers a button look's faces with the addon and names them.
 *
 * One definition per state, plus one for the caption every state references,
 * so a caption is emitted once however many faces a button has. Named by the
 * look, so every screen of the addon that draws this button draws these.
 */
export const shareButtonFaces = (node: FacedNode, ctx: FaceEmit): ButtonFaces => {
  const id = faceId('button', faceSignature(node));
  const { faces, facesNs } = ctx;
  const content = node.children.length === 0 ? undefined : `${facesNs}.${id}_content`;

  if (content !== undefined) {
    shareFace(faces, `${id}_content`, {
      type: 'panel',
      size: FULL,
      ...topLeft,
      controls: ctx.shared(node.children),
    });
  }

  const { face } = node;
  const named = {
    id,
    rest: shareFace(faces, id, stateFace(face.texture, content)),
    hover: shareFace(faces, `${id}_hover`, stateFace(face.hover, content)),
    pressed: shareFace(faces, `${id}_pressed`, stateFace(face.pressed, content)),
    ...face.disabled === undefined ? {} : { disabled: shareFace(faces, `${id}_disabled`, stateFace(face.disabled, content)) },
  };

  return {
    ...named,
    rest: `${facesNs}.${named.rest}`,
    hover: `${facesNs}.${named.hover}`,
    pressed: `${facesNs}.${named.pressed}`,
    ...named.disabled === undefined ? {} : { disabled: `${facesNs}.${named.disabled}` },
  };
};

export const buttonDefinition: NodeDefinition<ButtonNode> = {
  kind: 'button',
  types: [BUTTON_TYPE],

  lower(element, _type, ctx): ButtonNode | ExitNode {
    const { props } = element;

    // A close button is the client's: no cell to look up, nothing for the
    // runtime to poll.
    if (isExitButton(element)) {
      return {
        kind: 'exit',
        name: ctx.name('exit'),
        rect: ctx.rect,
        ...ctx.decoration,
        face: faceOf(props),
        children: ctx.children(element, ctx.own),
      };
    }

    const cell = ctx.cellOf(element);

    return {
      kind: 'button',
      name: ctx.name('button'),
      rect: ctx.rect,
      ...ctx.decoration,
      address: cell.address,
      face: faceOf(props),
      // Baked into the face, relative to the button like any other child.
      children: ctx.children(element, ctx.own),
    };
  },

  children: node => node.children,

  socket: () => 'press',

  // At rest: the resting face at the button's place. A host stands its
  // mechanism here and draws the other states through the same faces.
  face(node, ctx) {
    const faces = shareButtonFaces(node, ctx);

    return {
      [node.name]: {
        type: 'panel',
        size: sizeOf(node.rect),
        offset: offsetOf(node.rect),
        ...topLeft,
        ...layerOf(node),
        ...visibilityOf(node),
        controls: [{ [`face@${faces.rest}`]: {} }],
      },
    };
  },
};

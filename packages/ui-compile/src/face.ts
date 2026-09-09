/**
 * IR -> the face document: every node drawn as its look, and nothing else.
 *
 * The first of the two passes ([10-faces-and-hosts](../docs/10-faces-and-hosts.md)).
 * What comes out is complete and drawable on its own — the layout baked as
 * literal rects, every look referenced from the addon's shared faces, every
 * socket drawn at rest — and carries no binding that reads a host. The host
 * pass (`fill.ts`) stands each socket's mechanism in afterwards, and may not
 * move anything.
 *
 * Every rule encoded here was measured in game, against a hand-written target
 * that rendered clean. They are not stylistic:
 *
 *  1. EXPLICIT PIXEL SIZES on anything under a host. A percentage child of a
 *     stack panel resolves unreliably along the stacking axis, and the solved
 *     rect is known anyway.
 *  2. `keep_ratio: false` on images. An image preserves its texture's aspect
 *     ratio by default, so a stretched image renders narrower than the box the
 *     layout solved for it.
 *  3. `localize: false` on literal text, because labels localize by default.
 *  4. A control name referenced anywhere must resolve, and a name a binding
 *     looks up is found screen-wide, so anything named is named after the
 *     screen too.
 */

import { ContainerScreenError } from '@bedrock-core/ui-runtime/compile';
import type { IrDocument, PanelNode } from './ir';
import type { Control, ControlEntry, Document } from './jsonui';
import { definitionFor, socketOf } from './nodes';
import { backgroundOf, FULL, sizeOf, topLeft } from './nodes/shared';
import type { FaceEmit, IrNode, Socket } from './nodes/types';
import { validateFace } from './validate';

/** Name of the definition the router mounts: the canvas with everything on it. */
export const SCREEN_DEFINITION = 'screen';

/** Name of the full-screen image the router mounts behind the canvas, when the screen has one. */
export const BACKDROP_DEFINITION = 'backdrop';

/** The namespace an addon's shared faces are emitted under. */
export const facesNamespaceOf = (addon: string): string => `${addon}_faces`;

/**
 * The namespace a screen's PREVIEW is emitted under: the face document alone,
 * mounted on the action form for the gallery. Its own namespace, so nothing
 * it defines or names collides with the screen the host serves — every gated
 * compiled screen is constructed on every form open, and a name a binding
 * looks up is found screen-wide.
 */
export const previewNamespaceOf = (namespace: string): string => `${namespace}__preview`;

/** A screen as faces alone, under its preview namespace: what the gallery opens. */
export interface Preview {
  /** The JSON UI namespace: `<screen namespace>__preview`. */
  namespace: string;
  /** The title the runtime opens the preview with, and what its gate reads. */
  title: string;
  /** The face document, renamed into the preview namespace. Complete, static, drawable. */
  document: Document;
  hasBackdrop: boolean;
}

/**
 * A screen drawn as faces: what the face pass hands the host pass, and what
 * the gallery shows on its own.
 */
export interface FaceDocument {
  /** The screen's JSON UI namespace. */
  namespace: string;
  /** The namespace of the addon's shared faces. */
  facesNamespace: string;
  /**
   * The looks this screen shares with every other screen of the addon, by
   * a name derived from each look. Merged into the addon's `faces.json`.
   */
  faces: Record<string, Control>;
  /** The screen: its canvas, its backdrop, its own definitions. Complete, static, drawable. */
  document: Document;
  /** Every place a host has to stand a mechanism, in document order. */
  sockets: readonly Socket[];
  /** The canvas, for a host that derives definitions from the whole tree. */
  root: PanelNode;
  /** The collection the host's mechanisms read from. */
  collection: string;
  /** The host renderer that hides the runtime's transport item, if the host has one. */
  ownedRenderer?: string;
}

/**
 * Entries renamed by position, recursively, so a subtree baked into a shared
 * face reads the same from every screen that bakes it.
 */
const canonical = (entries: ControlEntry[]): ControlEntry[] => entries.map((entry, index) => {
  const [key, control] = Object.entries(entry)[0] ?? ['', {}];
  const base = key.includes('@') ? `@${key.split('@')[1] ?? ''}` : '';

  return {
    [`c${index}${base}`]: control.controls === undefined ? control : { ...control, controls: canonical(control.controls) },
  };
});

/**
 * Draws a solved tree as faces.
 *
 * @param doc - The solved IR.
 */
export const faceOf = (doc: IrDocument): FaceDocument => {
  const facesNamespace = doc.faces ?? facesNamespaceOf(doc.namespace);
  const faces: Record<string, Control> = {};
  const sockets: Socket[] = [];
  const defs: Record<string, Control> = {};

  const emitNode = (node: IrNode): ControlEntry => {
    // Outer first: a subtree whose visibility is carried is wrapped before
    // anything inside it is filled, and the host finds the inner sockets
    // inside its wrapper by name.
    if (node.visibleEntry !== undefined) {
      sockets.push({ node, kind: 'visible' });
    }

    const kind = socketOf(node);

    if (kind !== undefined) {
      sockets.push({ node, kind });
    }

    return definitionFor(node.kind).face(node, context);
  };

  const shared = (nodes: readonly IrNode[]): ControlEntry[] => {
    const socketsBefore = sockets.length;
    const defsBefore = Object.keys(defs).length;
    const entries = nodes.map(node => emitNode(node));

    if (sockets.length !== socketsBefore) {
      const [first] = sockets.splice(socketsBefore);

      throw new ContainerScreenError(
        `A <${first?.node.kind ?? 'control'}> that changes at runtime is baked into a button's face. `
        + 'A face is shared by every button that looks the same, so nothing inside it can carry a value or a press.',
      );
    }

    if (Object.keys(defs).length !== defsBefore) {
      throw new ContainerScreenError(
        'A control that needs a definition of its own (a scroll, tabs, a disclosure) is baked into a button\'s face; '
        + 'put it beside the button instead.',
      );
    }

    return canonical(entries);
  };

  const context: FaceEmit = { ns: doc.namespace, facesNs: facesNamespace, faces, defs, emitNode, shared };

  const { root } = doc;
  const background = backgroundOf(root);
  const children = root.children.map(child => emitNode(child));
  // Above the background by a layer, as a panel keeps its children — see the
  // panel kind for why an equal layer is not enough.
  const content: ControlEntry = { content: { type: 'panel', size: FULL, ...topLeft, layer: 1, controls: children } };

  const document: Document = {
    namespace: doc.namespace,
    [SCREEN_DEFINITION]: {
      type: 'panel',
      size: sizeOf(root.rect),
      ...topLeft,
      controls: [
        ...background,
        ...background.length === 0 ? children : [content],
      ],
    },
    ...defs,
  };

  if (doc.backdrop !== undefined) {
    // The whole screen, not the canvas: the router mounts it behind the
    // canvas at screen level, gated the same way.
    document[BACKDROP_DEFINITION] = {
      type: 'image',
      texture: doc.backdrop,
      size: FULL,
      keep_ratio: false,
    };
  }

  validateFace(document, faces, doc.namespace, facesNamespace);

  return {
    namespace: doc.namespace,
    facesNamespace,
    faces,
    document,
    sockets,
    root,
    collection: doc.collection,
    ...doc.ownedItemRenderer === undefined ? {} : { ownedRenderer: doc.ownedItemRenderer },
  };
};

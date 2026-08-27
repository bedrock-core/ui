/**
 * IR -> JSON UI.
 *
 * Every rule encoded here was measured in game, against a hand-written target
 * that rendered clean. They are not stylistic:
 *
 *  1. THE HOST RULE. `collection_index` is accepted only on a direct child of a
 *     control declaring `collection_name`, and `collection_name` is legal only
 *     on `stack_panel` and `grid`. So anything that reads a slot gets a
 *     one-child `stack_panel` host directly above it. The host carries the
 *     solved offset, the child carries the index.
 *
 *  2. NO VARIABLES IN BINDINGS. A `$var` inside `source_property_name` kills the
 *     property outright in a subtree inserted through `modifications`. Every
 *     number in a binding is baked as a literal, which also means no shared,
 *     parameterised control can own a binding — hence one definition per control
 *     *shape*, with references supplying what varies.
 *
 *  3. EXPLICIT PIXEL SIZES on anything under a host. A percentage child of a
 *     stack panel resolves unreliably along the stacking axis, and the solved
 *     rect is known anyway.
 *
 *  4. `keep_ratio: false` on images. An image preserves its texture's aspect
 *     ratio by default, so a stretched image renders narrower than the box the
 *     layout solved for it.
 *
 *  5. `localize: false` on literal text, because labels localize by default.
 *
 * How each kind of node emits is that kind's business, in its module under
 * `nodes/`; this pass assembles the document around them: the shared
 * definitions, the per-look definitions, the canvas, and the backdrop.
 */

import type { IrDocument, PanelNode } from './ir';
import type { ControlEntry, Document } from './jsonui';
import { collectShapes, emitNode, NODE_DEFINITIONS, sharedDefs } from './nodes';
import { backgroundOf, FULL, sizeOf, topLeft } from './nodes/shared';
import type { Emit } from './nodes/types';

/** Name of the definition the router mounts: the canvas with everything on it. */
export const SCREEN_DEFINITION = 'screen';

/**
 * A full-canvas button that swallows a click so it never falls through to the
 * chest screen's drop-the-cursor mapping. Sits under the content — the slots
 * and buttons above it handle their own clicks — so only empty space inside the
 * container absorbs, and a click OUTSIDE the canvas still drops, the way a click
 * beside a vanilla furnace's panel does.
 */
const CLICK_SHIELD: ControlEntry = {
  core_ui_click_shield: {
    type: 'button',
    size: ['100%', '100%'],
    button_mappings: [
      { from_button_id: 'button.menu_select', to_button_id: 'button.menu_select', mapping_type: 'pressed' },
      { from_button_id: 'button.menu_ok', to_button_id: 'button.menu_ok', mapping_type: 'pressed' },
    ],
  },
};

/** Name of the full-screen image the router mounts behind the canvas, when the screen has one. */
export const BACKDROP_DEFINITION = 'backdrop';

/** Turns a solved tree into a JSON UI document. */
export const emit = (doc: IrDocument): Document => {
  const kinds = new Set<string>();

  collectShapes(doc.root, kinds);

  const root: PanelNode = doc.root;
  const context: Emit = {
    ns: doc.namespace,
    collection: doc.collection,
    ...doc.ownedItemRenderer === undefined ? {} : { ownedRenderer: doc.ownedItemRenderer },
    textNames: new Map(),
    faceNames: new Map(),
    defs: {},
    emitNode: node => emitNode(node, context),
  };

  const document: Document = {
    namespace: doc.namespace,
    ...sharedDefs(doc.namespace, doc.collection, kinds),
  };

  for (const definition of NODE_DEFINITIONS) {
    definition.assemble?.(root, document, context);
  }

  document[SCREEN_DEFINITION] = {
    type: 'panel',
    size: sizeOf(root.rect),
    ...topLeft,
    controls: [
      CLICK_SHIELD,
      ...backgroundOf(root),
      ...root.children.map(child => context.emitNode(child)),
    ],
  };

  Object.assign(document, context.defs);

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

  return document;
};

/**
 * IR -> JSON UI.
 *
 * Every rule encoded here was measured in game, on the spike branch, against a
 * hand-written target that rendered clean. They are not stylistic:
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
 *     ratio by default, so a stretched bar renders narrower than its box while a
 *     clipped overlay on top does not.
 *
 *  5. `localize: false` on literal text, because labels localize by default.
 */

import type { IrDocument, IrNode, PanelNode, Rect } from './ir';
import type { Control, ControlEntry, Document } from './jsonui';

/** Shared definition names. One per control shape, never one per node. */
const DEF = {
  slotHost: 'slot_host',
  slot: 'slot',
  barHost: 'bar_host',
  bar: 'bar',
  barFill: 'bar_fill',
} as const;

/** The variable a slot host passes to its child. Ordinary property, so legal. */
const SLOT_VAR = '$slot';

const topLeft = {
  anchor_from: 'top_left',
  anchor_to: 'top_left',
} as const;

const offsetOf = (rect: Rect): [number, number] => [rect.x, rect.y];
const sizeOf = (rect: Rect): [number, number] => [rect.width, rect.height];

/**
 * Definitions shared by every node of a given kind. Emitted only when the tree
 * actually contains one, so a screen with no bars carries no bar definitions.
 */
const sharedDefs = (collection: string, kinds: Set<IrNode['kind']>): Record<string, Control> => {
  const defs: Record<string, Control> = {};

  if (kinds.has('slot')) {
    defs[DEF.slotHost] = {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [18, 18],
      ...topLeft,
      collection_name: collection,
      [`${SLOT_VAR}|default`]: 0,
      controls: [{ [`cell@${DEF.slot}`]: { collection_index: SLOT_VAR } }],
    };

    defs[DEF.slot] = {
      type: 'panel',
      size: [18, 18],
      controls: [{ 'item@common.container_item': { $item_collection_name: collection } }],
    };
  }

  if (kinds.has('bar')) {
    defs[DEF.barHost] = {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [0, 0],
      ...topLeft,
      collection_name: collection,
      controls: [],
    };

    defs[DEF.bar] = {
      type: 'panel',
      size: [0, 0],
      controls: [
        {
          track: {
            type: 'image',
            texture: '',
            size: ['100%', '100%'],
            keep_ratio: false,
            layer: 0,
          },
        },
        { [`fill@${DEF.barFill}`]: {} },
      ],
    };

    defs[DEF.barFill] = {
      type: 'image',
      texture: '',
      size: ['100%', '100%'],
      keep_ratio: false,
      layer: 1,
      clip_pixelperfect: false,
      bindings: [
        { binding_type: 'collection_details', binding_collection_name: collection },
        {
          binding_name: '#item_durability_current_amount',
          binding_name_override: '#dur',
          binding_type: 'collection',
          binding_collection_name: collection,
        },
        {
          binding_name: '#item_durability_total_amount',
          binding_name_override: '#durmax',
          binding_type: 'collection',
          binding_collection_name: collection,
        },
        {
          binding_type: 'view',
          source_property_name: '(#dur / #durmax)',
          target_property_name: '#clip_ratio',
        },
      ],
    };
  }

  return defs;
};

const collectKinds = (node: IrNode, into: Set<IrNode['kind']>): void => {
  into.add(node.kind);

  if (node.kind === 'panel') {
    for (const child of node.children) {
      collectKinds(child, into);
    }
  }
};

/**
 * One node becomes one entry in its parent's `controls`. Static leaves are
 * inlined; anything reading a slot becomes a host reference, because the index
 * has nowhere else to live.
 */
const emitNode = (node: IrNode, ns: string): ControlEntry => {
  switch (node.kind) {
    case 'panel':
      return {
        [node.name]: {
          type: 'panel',
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...topLeft,
          controls: node.children.map(child => emitNode(child, ns)),
        },
      };

    case 'label':
      return {
        [node.name]: {
          type: 'label',
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...topLeft,
          text: node.text,
          localize: node.localize ?? false,
          ...node.color ? { color: node.color } : {},
          ...node.shadow ? { shadow: node.shadow } : {},
        },
      };

    case 'image':
      return {
        [node.name]: {
          type: 'image',
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...topLeft,
          texture: node.texture,
          keep_ratio: false,
        },
      };

    case 'slot':
      return {
        [`${node.name}@${ns}.${DEF.slotHost}`]: {
          offset: offsetOf(node.rect),
          size: sizeOf(node.rect),
          [SLOT_VAR]: node.slot,
        },
      };

    case 'bar':
      // The host cannot pass the child's textures through a variable without
      // ending up inside a binding, so the bar's own controls are respecialised
      // at the reference. Cheap: two overrides, no extra definitions.
      return {
        [`${node.name}@${ns}.${DEF.barHost}`]: {
          offset: offsetOf(node.rect),
          size: sizeOf(node.rect),
          controls: [
            {
              [`bar@${ns}.${DEF.bar}`]: {
                collection_index: node.channel,
                size: sizeOf(node.rect),
                controls: [
                  {
                    track: {
                      type: 'image',
                      texture: node.trackTexture,
                      size: ['100%', '100%'],
                      keep_ratio: false,
                      layer: 0,
                    },
                  },
                  {
                    [`fill@${ns}.${DEF.barFill}`]: {
                      texture: node.fillTexture,
                      clip_direction: node.direction,
                    },
                  },
                ],
              },
            },
          ],
        },
      };
  }
};

/** Turns a solved tree into a JSON UI document. */
export const emit = (doc: IrDocument): Document => {
  const kinds = new Set<IrNode['kind']>();

  collectKinds(doc.root, kinds);

  const root: PanelNode = doc.root;

  const document: Document = {
    namespace: doc.namespace,
    ...sharedDefs(doc.collection, kinds),
  };

  document[doc.entry] = {
    type: 'panel',
    size: sizeOf(root.rect),
    ...topLeft,
    controls: root.children.map(child => emitNode(child, doc.namespace)),
  };

  return document;
};

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

import type { IrDocument, IrNode, PanelNode, Rect, TextNode } from './ir';
import type { Control, ControlEntry, Document } from './jsonui';

/** Shared definition names. One per control shape, never one per node. */
const DEF = {
  slotHost: 'slot_host',
  slot: 'slot',
  clipHost: 'clip_host',
  clip: 'clip_image',
  textHost: 'text_host',
  text: 'text_channel',
} as const;

/**
 * Shapes needing a shared definition. Not the same as `IrNode['kind']`: a label
 * is one kind but two shapes, because a dynamic one reads a collection and a
 * static one bakes its string.
 */
type Shape = 'slot' | 'clip' | 'text';

/** The variable a slot host passes to its child. Ordinary property, so legal. */
const SLOT_VAR = '$slot';

/**
 * Private name a text channel's string is renamed to.
 *
 * Never `#hover_text` itself: the engine owns that name at screen scope and
 * overwrites it while a slot is pressed.
 */
const TEXT_PROPERTY = '#channel_text';

/** A literal inside a JSON UI expression is single-quoted. */
const literal = (value: string): string => `'${value.replaceAll(String.fromCharCode(39), '')}'`;

const topLeft = {
  anchor_from: 'top_left',
  anchor_to: 'top_left',
} as const;

const offsetOf = (rect: Rect): [number, number] => [rect.x, rect.y];

/** Emitted only when the author asked, so nothing is layered by accident. */
const layerOf = (node: { layer?: number }): { layer?: number } =>
  node.layer === undefined ? {} : { layer: node.layer };
const sizeOf = (rect: Rect): [number, number] => [rect.width, rect.height];

/**
 * Definitions shared by every node of a given kind. Emitted only when the tree
 * actually contains one, so a screen with no bars carries no bar definitions.
 */
const sharedDefs = (collection: string, kinds: Set<Shape>): Record<string, Control> => {
  const defs: Record<string, Control> = {};

  if (kinds.has('text')) {
    defs[DEF.textHost] = {
      type: 'stack_panel',
      orientation: 'vertical',
      size: ['100%c', '100%c'],
      ...topLeft,
      collection_name: collection,
      controls: [],
    };
  }

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

  if (kinds.has('clip')) {
    defs[DEF.clipHost] = {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [0, 0],
      ...topLeft,
      collection_name: collection,
      controls: [],
    };

    // A fill: an image revealed in proportion to a number. Two of these, one
    // whole and one clipped, are what a bar is made of -- there is no bar
    // control, because the same pair makes a gauge, a meter or a cooldown.
    //
    // `keep_ratio: false` because an image preserves its texture's aspect ratio
    // by default, so a stretched fill renders narrower than its box while the
    // clip on top does not.
    defs[DEF.clip] = {
      type: 'image',
      texture: '',
      size: ['100%', '100%'],
      keep_ratio: false,
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

/** Where the raw code lands before the key is built around it. */
const TEXT_RAW_PROPERTY = '#channel_raw';

/**
 * What lets two text runs share a definition: everything except which slots
 * they read.
 */
const signatureOf = (node: TextNode): string => JSON.stringify([
  node.keyPrefix,
  node.color ?? null,
  node.shadow ?? null,
]);

/**
 * The definition one character cell instantiates.
 *
 * A binding cannot be parameterised: a `$variable` inside one is dropped
 * outright in a subtree inserted through `modifications` -- measured six ways
 * on the spike -- so every name in a binding is baked here, and a reference may
 * only supply what is NOT a binding: the collection index, and the box.
 *
 * The cell reads its slot's STACK SIZE, builds `keyPrefix + code`, and
 * localizes it. No per-slot binding publishes text, so this is how a string
 * gets in: the generated `.lang` decides what each code draws as, which means
 * any glyph, any font, any language.
 */
const textDef = (node: TextNode, collection: string): Control => ({
  type: 'label',
  // Its own natural size. The cells are packed by the engine rather than
  // positioned by the compiler, because glyph widths are not knowable here:
  // which character lands in a cell is decided at runtime. On a fixed pitch
  // every narrow glyph left a gap -- `units` came out `uni ts`.
  size: ['default', 'default'],
  text: TEXT_PROPERTY,
  localize: true,
  ...node.color ? { color: node.color } : {},
  ...node.shadow ? { shadow: node.shadow } : {},
  bindings: [
    { binding_type: 'collection_details', binding_collection_name: collection },
    {
      binding_name: '#inventory_stack_count',
      binding_name_override: TEXT_RAW_PROPERTY,
      binding_type: 'collection',
      binding_collection_name: collection,
    },
    {
      binding_type: 'view',
      source_property_name: `(${literal(node.keyPrefix)} + ${TEXT_RAW_PROPERTY})`,
      target_property_name: TEXT_PROPERTY,
    },
  ],
});

/** Collects every text run, so one definition can be emitted per shape. */
const collectTexts = (node: IrNode, into: TextNode[] = []): TextNode[] => {
  if (node.kind === 'text') {
    into.push(node);
  }

  if (node.kind === 'panel') {
    for (const child of node.children) {
      collectTexts(child, into);
    }
  }

  return into;
};

const collectShapes = (node: IrNode, into: Set<Shape>): void => {
  if (node.kind === 'slot') {
    into.add('slot');
  }

  if (node.kind === 'image' && node.channel !== undefined) {
    into.add('clip');
  }

  if (node.kind === 'text') {
    into.add('text');
  }

  if (node.kind === 'panel') {
    for (const child of node.children) {
      collectShapes(child, into);
    }
  }
};

/**
 * One node becomes one entry in its parent's `controls`. Static leaves are
 * inlined; anything reading a slot becomes a host reference, because the index
 * has nowhere else to live.
 */
const emitNode = (node: IrNode, ns: string, textNames: Map<string, string>): ControlEntry => {
  switch (node.kind) {
    case 'panel':
      return {
        [node.name]: {
          type: 'panel',
          size: sizeOf(node.rect),
          ...layerOf(node),
          offset: offsetOf(node.rect),
          ...topLeft,
          controls: node.children.map(child => emitNode(child, ns, textNames)),
        },
      };

    case 'label':
      return {
        [node.name]: {
          type: 'label',
          size: sizeOf(node.rect),
          ...layerOf(node),
          offset: offsetOf(node.rect),
          ...topLeft,
          text: node.text,
          localize: node.localize ?? false,
          ...node.color ? { color: node.color } : {},
          ...node.shadow ? { shadow: node.shadow } : {},
        },
      };

    case 'text': {
      // One host per cell, because `collection_index` is only accepted on a
      // direct child of a control declaring `collection_name`. The hosts sit in
      // a horizontal stack panel and hug their glyph, so the run reads as text
      // rather than as a grid of letters.
      const def = textNames.get(signatureOf(node)) ?? DEF.text;
      const hug: [string, string] = ['100%c', '100%c'];

      return {
        [node.name]: {
          type: 'stack_panel',
          orientation: 'horizontal',
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...layerOf(node),
          ...topLeft,
          controls: Array.from({ length: node.length }, (_unused, cell) => ({
            [`cell_${cell}@${ns}.${DEF.textHost}`]: {
              size: hug,
              controls: [{ [`glyph@${ns}.${def}`]: { collection_index: node.channel + cell } }],
            },
          })),
        },
      };
    }

    case 'image':
      // A plain image is inlined; a clipped one has to reach a slot, so it gets
      // a host for its index like anything else that reads the collection.
      if (node.channel === undefined) {
        return {
          [node.name]: {
            type: 'image',
            size: sizeOf(node.rect),
            ...layerOf(node),
            offset: offsetOf(node.rect),
            ...topLeft,
            texture: node.texture,
            keep_ratio: false,
          },
        };
      }

      return {
        [`${node.name}@${ns}.${DEF.clipHost}`]: {
          offset: offsetOf(node.rect),
          size: sizeOf(node.rect),
          ...layerOf(node),
          controls: [
            {
              [`fill@${ns}.${DEF.clip}`]: {
                collection_index: node.channel,
                size: sizeOf(node.rect),
                texture: node.texture,
                ...node.direction ? { clip_direction: node.direction } : {},
              },
            },
          ],
        },
      };

    case 'ref':
      // Something the game already defines: the compiled screen owns the whole
      // chest screen, so anything vanilla the author still wants is asked for
      // by name. Sizing is optional because several vanilla parts size
      // themselves and resist being told otherwise.
      return {
        [`${node.name}@${node.ref}`]: node.sized
          ? { offset: offsetOf(node.rect), size: sizeOf(node.rect), ...topLeft, ...layerOf(node) }
          : layerOf(node),
      };

    case 'slot':
      return {
        [`${node.name}@${ns}.${DEF.slotHost}`]: {
          offset: offsetOf(node.rect),
          size: sizeOf(node.rect),
          ...layerOf(node),
          [SLOT_VAR]: node.slot,
        },
      };
  }
};

/** Turns a solved tree into a JSON UI document. */
export const emit = (doc: IrDocument): Document => {
  const kinds = new Set<Shape>();

  collectShapes(doc.root, kinds);

  const root: PanelNode = doc.root;

  const document: Document = {
    namespace: doc.namespace,
    ...sharedDefs(doc.collection, kinds),
  };

  // One definition per distinct text channel shape, shared by every label that
  // wants it. Channels differing only in which slot they read collapse onto the
  // same definition, because the index is the one thing a reference may supply.
  const textNames = new Map<string, string>();

  for (const node of collectTexts(root)) {
    const signature = signatureOf(node);

    if (textNames.has(signature)) {
      continue;
    }

    const name = `${DEF.text}_${textNames.size + 1}`;

    textNames.set(signature, name);
    document[name] = textDef(node, doc.collection);
  }

  document[doc.entry] = {
    type: 'panel',
    size: sizeOf(root.rect),
    ...topLeft,
    controls: root.children.map(child => emitNode(child, doc.namespace, textNames)),
  };

  return document;
};

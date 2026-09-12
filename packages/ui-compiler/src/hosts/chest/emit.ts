import {
  CELL, foreignSlot, grid, press, pressDefs, slot, text, textDef, TEXT_DEF,
} from '../../connectors/chest';
import type { TextStyle } from '../../faces';
import type { ControlEntry } from '../../jsonui';
import { collectKind } from '../../nodes';
import { type ButtonNode, faceSignature, pressAddress } from '../../nodes/primitives/button';
import type { GridNode } from '../../nodes/primitives/grid';
import { faceId } from '../../nodes/utils/shared';
import type { SlotNode } from '../../nodes/primitives/slot';
import { isLive, runOf, type TextNode, textSignature } from '../../nodes/primitives/text';
import type { Emit, HostEmit } from '../../nodes/utils/types';

/**
 * How the chest draws the sockets whose mechanism is its own.
 *
 * A chest screen carries everything through container slots the runtime polls
 * a tick at a time. A press can only reach script as an item move — JSON UI's
 * button mappings produce game actions, and the container transaction is the
 * only one the server sees — and a string can only cross as numbers, one
 * slot's stack size per character. Every mechanism here is one of those two
 * facts spelled out as JSON UI; the LOOK it draws is the face the face pass
 * already shared.
 *
 * Every number in a binding here is a literal on purpose. A `$variable`
 * inside a `source_property_name` is silently dropped in a subtree the engine
 * inserted through `modifications`, which is how every compiled screen is
 * mounted.
 */

/** The shared faces of one button look, fully qualified, as the face pass named them. */
const facesOf = (node: ButtonNode, ctx: Emit): { id: string; rest: string; hover: string; pressed: string; disabled: string } => {
  const id = faceId('button', faceSignature(node));

  return {
    id,
    rest: `${ctx.facesNs}.${id}`,
    hover: `${ctx.facesNs}.${id}_hover`,
    pressed: `${ctx.facesNs}.${id}_pressed`,
    disabled: `${ctx.facesNs}.${node.face.disabled === undefined ? id : `${id}_disabled`}`,
  };
};

/**
 * Which cell a slot host instantiates: an inert cell for a locked slot, the
 * guard-toggled pair for an output slot, or the host's default otherwise. An
 * input's refusals are the runtime's, so it needs no cell of its own.
 */
const cellOf = (node: SlotNode): { cell?: string } => {
  if (!node.interactive) {
    return { cell: CELL.lockedSlot };
  }

  return node.role === 'output' ? { cell: CELL.outputSlot } : {};
};

/** A live label's look, as the face layer names its fields. */
const styleOf = (node: TextNode): TextStyle => ({
  fontType: node.fontType,
  fontScaleFactor: node.fontScaleFactor,
  ...node.shadow === undefined ? {} : { shadow: node.shadow },
  ...node.color === undefined ? {} : { color: node.color },
  ...node.textAlignment === undefined ? {} : { align: node.textAlignment },
});

export const CHEST_EMIT: HostEmit = {
  id: 'chest',

  /**
   * A full-canvas button that swallows a click so it never falls through to the
   * chest screen's drop-the-cursor mapping. Sits under the content — the slots
   * and buttons above it handle their own clicks — so only empty space inside
   * the container absorbs, and a click OUTSIDE the canvas still drops, the way
   * a click beside a vanilla furnace's panel does.
   */
  chrome: (): ControlEntry[] => [{
    core_ui_click_shield: {
      type: 'button',
      size: ['100%', '100%'],
      button_mappings: [
        { from_button_id: 'button.menu_select', to_button_id: 'button.menu_select', mapping_type: 'pressed' },
        { from_button_id: 'button.menu_ok', to_button_id: 'button.menu_ok', mapping_type: 'pressed' },
      ],
    },
  }],

  /**
   * The definitions a chest screen shares by reference: one per distinct button
   * look, one per distinct text channel shape. Both are mechanism — a button is
   * built on `container_item` with the item hidden, a channel reads a slot's
   * stack size through the `.lang` table — and both draw the faces the face
   * pass shared.
   */
  assemble(root, document, ctx): void {
    // A button the engine routes has no press to report, so it needs no
    // mechanism definition — only the shared faces, which the face pass has
    // already emitted.
    for (const node of collectKind(root, 'button').filter(button => button.action === undefined)) {
      const id = faceId('button', faceSignature(node));

      if (!ctx.faceNames.has(id)) {
        const definition = `press_${ctx.faceNames.size + 1}`;

        ctx.faceNames.set(id, definition);
        Object.assign(document, pressDefs({
          definition,
          size: [node.rect.width, node.rect.height],
          ...facesOf(node, ctx),
        }, ctx));
      }
    }

    // A baked string carries nothing, so it needs no carrier definition: the
    // face already drew it and nothing will ever change it.
    for (const node of collectKind(root, 'text').filter(isLive)) {
      const signature = textSignature(node);

      if (!ctx.textNames.has(signature)) {
        const definition = `${TEXT_DEF.text}_${ctx.textNames.size + 1}`;

        ctx.textNames.set(signature, definition);
        document[definition] = textDef(styleOf(node), ctx.collection);
      }
    }
  },

  fill: {
    press: (node: ButtonNode, entry, ctx): ControlEntry => press(
      { name: node.name, address: pressAddress(node), definition: ctx.faceNames.get(faceId('button', faceSignature(node))) ?? 'press_1' },
      entry,
      ctx,
    ),

    text: (node: TextNode, entry, ctx): ControlEntry => text(
      {
        name: node.name,
        ...runOf(node),
        definition: ctx.textNames.get(textSignature(node)) ?? TEXT_DEF.text,
      },
      entry,
      ctx,
    ),

    slot: (node: SlotNode, entry, ctx): ControlEntry => (node.source === undefined
      ? slot({ name: node.name, address: node.address, ...cellOf(node) }, entry, ctx)
      : foreignSlot(
          {
            name: node.name,
            collection: node.source.collection,
            index: node.source.index,
            interactive: node.source.interactive,
          },
          entry,
          ctx,
        )),

    grid: (node: GridNode, entry, ctx): ControlEntry => grid(
      {
        name: node.name,
        collection: node.collection,
        columns: node.columns,
        rows: node.rows,
        interactive: node.interactive,
        hideOwned: node.hideOwned,
      },
      entry,
      ctx,
    ),
  },
};

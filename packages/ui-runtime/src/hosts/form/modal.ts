import type { Player } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import {
  collectFormButtons, type FormConfig, type FormValues, MODAL_FORM_SLOT_TYPE,
} from '../../components/Form';
import { listCount } from '../../components/List';
import { visiblesAt } from '../../core/ir';
import type { CompiledSnapshot } from '../../core/render/screens';
import { emitLabel } from '../../core/writers';
import { allocateModal, type ModalRow } from './allocate';
import { debugDiff } from './debug';
import { liveText } from './runtime';
import { getComponentDescriptor } from '../../core/componentRegistry';
import { playerOwner } from '../../core/fabric';
import { childElements } from '../../core/guards';
import { runInteractiveCallback, type PresentResult } from '../../core/render/present';
import { isSwapPending } from '../../core/render/session';
import { isHandler } from '../../core/events';
import type { ModalSerializationContext, SerializablePrimitive, SerializableProps } from '../../core/types';
import type { JSX } from '../../jsx';

/**
 * A COMPILED modal: the same native fields, with none of the layout on the wire.
 *
 * An interpreted modal spends its whole payload describing itself. Every field's
 * label carries a serialized control block — position, size, textures, state —
 * and the title carries the scroll geometry and the submit/exit buttons, because
 * the render pack has to be told what to draw before it can draw it.
 *
 * A compiled modal has already been drawn. Its layout is a definition in the
 * addon's pack, and the title only has to say WHICH definition. So the fields
 * still go over natively — they are the engine's own controls and there is no
 * way to compile those — but they go over bare.
 *
 * ## The one thing this has to get right
 *
 * `formValues` is positional, and a `label()` row occupies a slot in it (the
 * engine returns `null` there). So the ordinal a field is recorded at must be
 * its real index in the response, counting every row including the ones that
 * carry nothing. {@link ModalSerializationContext.modalControlIndex} is that
 * count, kept by the writers themselves, which is why this walk drives the
 * writers rather than adding fields itself.
 *
 * Measured (S3): a control the PACK places reads its row by a baked
 * `collection_index` on `custom_form`, on the same terms S1 found for
 * `form_buttons` — the control itself must carry the `collection_details`
 * binding. So a compiled screen can read any row it has an index for, and the
 * index space here is the one it was compiled against.
 *
 * ## What still travels, and why it is not the layout
 *
 * A chooser's OPTIONS do. They are the one part of a field that is data rather
 * than layout: what the list contains is the author's, but which row is drawn
 * where inside the popup is decided per option, by a blob the render pack
 * decodes for its face and its label. The popup is the same popup on both
 * paths, so the rows read the same blobs on both. What the cell payload would
 * have carried — the field's own rect, state and textures — is what a
 * compiled screen drops, and that is the part that scales with the screen.
 *
 * Everything the pack draws AROUND the fields it takes from the compiled
 * definition, which is also where the payload-free variants live: a control
 * mounted by a compiled screen is handed its geometry and its faces as
 * `$variables` where an interpreted one decodes them (`travel_area_static`,
 * `state_face`'s `$static_texture`).
 */

/** What a compiled field's label carries: nothing. The pack draws the label. */
const BARE = '';

/**
 * The props a writer may read, which is the primitive ones.
 *
 * A writer takes `SerializableProps` because on the interpreted path it is
 * handed what the serializer built. Here it is handed the element's own, so
 * anything a payload could not have carried is dropped.
 */
const writerProps = (props: JSX.Props): SerializableProps => Object.fromEntries(
  Object.entries(props).filter((entry): entry is [string, SerializablePrimitive] =>
    typeof entry[1] === 'string' || typeof entry[1] === 'number' || typeof entry[1] === 'boolean'),
);

/**
 * Write one row, through the component's own writer so the ordinal bookkeeping
 * is the writers' throughout.
 *
 * The payload each row carries is empty: the field's look is already in the
 * pack, so the row exists to hold the engine's control and its slot in
 * `formValues`, and has nothing to describe.
 */
function writeRow(row: ModalRow, form: ModalFormData, context: ModalSerializationContext): void {
  const { element } = row;

  if (row.kind === 'text') {
    emitLabel(liveText(element, row.length ?? 0), form, context);

    return;
  }

  // A carried visible: one label row holding '0' or '1'. Nothing draws it —
  // a compiled modal mounts no row factory — the compiled gate reads it.
  if (row.kind === 'bool') {
    emitLabel(element.props.visible === false ? '0' : '1', form, context);

    return;
  }

  // A list's count, digits on a bare row the compiled gates compare against.
  if (row.kind === 'int') {
    emitLabel(String(listCount(element) ?? 0), form, context);

    return;
  }

  const { type, props, nativeArgs } = element;
  const descriptor = typeof type === 'string' ? getComponentDescriptor(type) : undefined;

  if (descriptor?.writer === undefined) {
    return;
  }

  // Handlers ride a side channel of their own: they are not primitives, so
  // they cannot travel in the props a writer takes.
  const callbacks: Record<string, (...args: unknown[]) => void> = {};

  for (const [key, value] of Object.entries(props)) {
    if (isHandler<(...args: unknown[]) => void>(value)) {
      callbacks[key] = value;
    }
  }

  // The props go through, though the payload does not. A chooser's OPTIONS are
  // DATA rather than layout: the render pack decodes each one's own blob for
  // its face and its label, on either path, and the popup those rows fill is
  // the same popup. What a compiled screen saves is the CELL block — the
  // field's own geometry, state and textures — which is what BARE drops.
  descriptor.writer(BARE, form, context, callbacks, writerProps(props), nativeArgs, props.children);
}

/**
 * Re-key positional `formValues` by each control's name.
 *
 * The registry is ordinal → name and the response is positional, so a row with
 * no name — a label, or a field the author left unnamed — is simply not in the
 * result.
 */
function collectValues(
  context: ModalSerializationContext,
  formValues: readonly (string | number | boolean | undefined)[] | undefined,
): FormValues {
  const values: FormValues = {};

  if (formValues === undefined) {
    return values;
  }

  for (const [ordinal, entry] of context.modalControls) {
    if (entry.name !== '') {
      values[entry.name] = formValues[ordinal];
    }
  }

  return values;
}

/**
 * Present one snapshot of a compiled `<Form>`.
 *
 * Submit and cancel run through the interactive transaction every form
 * callback runs in: being compiled changes nothing about what a modal IS. It is
 * one atomic submit, and nothing comes back until the player is done.
 *
 * @param player - Player to show the modal to.
 * @param tree - Built tree carrying the `<Form>` marker.
 * @param config - Chrome and lifecycle read off that marker.
 * @param title - The compiled title, which names the screen's definition.
 * @returns Whether to re-present, clean up, or do nothing.
 */
export async function presentCompiledModal(
  player: Player,
  tree: JSX.Element,
  config: FormConfig,
  title: string,
  snapshot?: CompiledSnapshot,
  debug = false,
): Promise<PresentResult> {
  if (debug && snapshot !== undefined) {
    for (const line of debugDiff(tree, snapshot, title)) {
      console.warn(line);
    }
  }

  const context: ModalSerializationContext = { mode: 'modal', modalControls: new Map(), modalControlIndex: 0 };
  const form = new ModalFormData();

  // The compiled title names the screen. Everything the interpreted title
  // carries — scroll geometry, the submit and exit button blocks — is already
  // in the pack, drawn by the definition this names.
  form.title(title);

  // The submit and exit buttons are not native controls and take no row; the
  // pack draws them. This is called for the check inside it — a form with no
  // submit is refused before a player is shown something they cannot send.
  collectFormButtons(tree);

  // One numbering, shared with the build: the row a compiled control was baked
  // against is the row written here and the slot the answer comes back in —
  // the snapshot's ordinals mark the carried visibles the build gave rows to.
  const rows = allocateModal(tree, visiblesAt(tree, snapshot?.vis ?? []));

  for (const row of rows) {
    writeRow(row, form, context);
  }

  if (debug) {
    console.info(`[ui] ${title} rows ${JSON.stringify(rows.map(row => row.kind))}`);
  }

  return form.show(player).then((response) => {
    if (response.canceled) {
      // A programmatic close during an app handoff is not a dismissal: the old
      // app is already dead and its onCancel must not act for the one that
      // replaced it.
      if (isSwapPending(playerOwner(player))) {
        return 'none';
      }

      if (config.onCancel) {
        return runInteractiveCallback(player, () => config.onCancel?.({ player }));
      }

      return 'cleanup';
    }

    const values = collectValues(context, response.formValues);

    if (config.onSubmit) {
      return runInteractiveCallback(player, () => config.onSubmit?.({ player, values }));
    }

    return 'none';
  });
}

/** Whether a built tree is a modal, which is what decides between the two backends. */
export const isModalTree = (tree: JSX.Element): boolean =>
  tree.type === MODAL_FORM_SLOT_TYPE
  || childElements(tree.props.children).some(child => isModalTree(child));

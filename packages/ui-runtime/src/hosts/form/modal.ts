import type { Player } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';
import { collectFormButtons, type FormConfig, type FormValues, MODAL_FORM_SLOT_TYPE } from '../../components/Form';
import { listCount } from '../../components/List';
import { visiblesAt } from '../../core/ir';
import type { CompiledSnapshot } from '../../core/render/screens';
import { serializeProps } from '../../core/payload';
import { FLAG_OFF, FLAG_ON } from './contract';
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
import type { ModalControlEntry, ModalSerializationContext, SerializablePrimitive, SerializableProps } from '../../core/types';
import type { JSX } from '../../jsx';
import { MODAL_SLIDER_SLOT_TYPE } from '../../core/fields';

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

  // One row is one entry of the form's collection, whatever it answers with.
  context.modalRowIndex++;

  if (row.kind === 'text') {
    emitLabel(liveText(element, row.length ?? 0), form, context);

    return;
  }

  // A carried visible: one label row holding the form contract's flag, the
  // same letter a compiled gate compares against on an action form. Nothing
  // draws it — a compiled modal mounts no row factory — the gate reads it.
  if (row.kind === 'bool') {
    emitLabel(element.props.visible === false ? FLAG_OFF : FLAG_ON, form, context);

    return;
  }

  // A list's count, digits on a bare row the compiled gates compare against.
  if (row.kind === 'int') {
    emitLabel(String(listCount(element) ?? 0), form, context);

    return;
  }

  // A multiple select owns one row per option, and its writer emits all of
  // them on its first: the later rows only keep the row count in step.
  if (row.member !== undefined && row.member > 0) {
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

  // The props go through, though the payload usually does not. A chooser's
  // OPTIONS are DATA rather than layout: the render pack decodes each one's own
  // blob for its face and its label, on either path, and the popup those rows
  // fill is the same popup. What a compiled screen saves is the CELL block —
  // the field's own geometry, state and textures — which is what BARE drops.
  //
  // A SLIDER IS THE EXCEPTION. It is the one field a compiled screen cannot
  // place: a slider takes its step range from the form field behind it, and a
  // statically placed one is laid out on every form in the world, including
  // forms that have no such field — where any write to its value asserts. So
  // the engine's own factory builds it instead, one cell per slider ROW
  // (modal_container's `live_sliders`), and a cell built in row order has no
  // way to know the rect the build solved for it. Its block is what tells it.
  const carried = type === MODAL_SLIDER_SLOT_TYPE
    ? serializeProps({ type, row: context.modalRowIndex })[0]
    : BARE;

  descriptor.writer(carried, form, context, callbacks, writerProps(props), nativeArgs, props.children);
}

/** One control's answer in the author's own units. */
const answer = (
  entry: ModalControlEntry,
  raw: string | number | boolean | undefined,
): string | number | boolean | undefined => (entry.decode === undefined ? raw : entry.decode(raw));

/**
 * Put one control's answer under its name.
 *
 * A member of a multiple select shares its name with the other members, so its
 * answer is gathered instead: the array exists as soon as one member is read,
 * which keeps a select with nothing on as `[]` rather than absent, and members
 * arrive in option order, so the indices come out sorted.
 */
const record = (values: FormValues, entry: ModalControlEntry, raw: string | number | boolean | undefined): void => {
  if (entry.member === undefined) {
    values[entry.name] = answer(entry, raw);

    return;
  }

  const gathered = values[entry.name];
  const members = Array.isArray(gathered) ? gathered : [];

  if (raw === true) {
    members.push(entry.member);
  }

  values[entry.name] = members;
};

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

  const named = [...context.modalControls].filter(([, entry]) => entry.name !== '');

  // Whether a row that carries no control — a label — takes a slot of its own
  // is the engine's to decide, and it has decided both ways across versions.
  // The response says which: as many slots as rows written means every row has
  // one and an ordinal IS the position; as many as named controls means only
  // the interactive rows are there and the Nth named control is the Nth value.
  // Anything else is a truncated answer: read by ordinal, which is what a short
  // response is short OF, and let the missing ones come back undefined.
  if (formValues.length === named.length && named.length !== context.modalControlIndex) {
    named.forEach(([, entry], position) => {
      record(values, entry, formValues[position]);
    });

    return values;
  }

  for (const [ordinal, entry] of named) {
    record(values, entry, formValues[ordinal]);
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

  const context: ModalSerializationContext = { mode: 'modal', modalControls: new Map(), modalControlIndex: 0, modalRowIndex: -1 };
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

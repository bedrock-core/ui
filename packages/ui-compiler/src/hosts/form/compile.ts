import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import {
  allocateForm, allocateModal, analyze, bakedTexts, buildScreenOnce, type CompiledSnapshot, concreteRoots,
  ContainerScreenError, embedMarker, embedPlacementOf, type EmbedPlacement, FORM_COLLECTION, formTitleFor, hostFor, probeLiveness, shapeOf,
  visiblesAt, type EntryEntry, type ModalRow,
} from '@bedrock-core/ui-runtime/compile';
import { checkLiveness, previewOf } from '../../compile';
import { staticTable, wantsStatic, type StaticScreen } from '../../static';
import { BACKDROP_DEFINITION, type FaceDocument, faceOf, facesNamespaceOf, type Preview } from '../../face';
import { fill } from '../../fill';
import type { Control, Document } from '../../jsonui';
import { MODAL_COLLECTION } from '../../connectors/form';
import type { Addressing } from '../../nodes/utils/types';
import { toIr } from '../../toIr';
import { FORM_EMIT } from './emit';

/**
 * Compiling a form screen.
 *
 * The same pipeline a container screen goes through — build once, probe, place,
 * lower, emit — with the two halves that are the host's answered by the form:
 * what a screen's root is, and where its cells and channels live.
 *
 * What is NOT here is as telling as what is. There is no entity, because a
 * form belongs to a player rather than a thing in the world. There is no
 * inventory to size and no layout key to stamp on it, because the title
 * carries the key. And there is no router: `main_screen_content` already gates
 * the library's own container on the protocol header, so a compiled screen is
 * mounted by being named in the title rather than by editing a vanilla file.
 */

export interface FormScreenSpec {
  /** Screen name from the file name, e.g. `home`. */
  name: string;
  /** The addon's namespace, e.g. `drav0011_shop`. */
  namespace: string;
}

export interface CompiledFormScreen {
  name: string;
  /** The addon's namespace the screen was compiled under. */
  addon: string;
  /** The JSON UI namespace: `<addon>_<name>`. */
  namespace: string;
  /** What the runtime shows the form with, and what the mount gates on. */
  title: string;
  /**
   * Set when the screen is drawn INTO another pack's: the string the host's
   * first entry carries while this screen is wanted. The router gates on it
   * in place of the title, since the title is the host's.
   */
  marker?: string;
  /** With `marker`: where the screen sits in the host's frame. Its canvas is the area; the mount places it. */
  embed?: EmbedPlacement;
  /** The JSON UI document: `screen` (+ `backdrop`) and its shared definitions. */
  document: Document;
  /** The screen as faces alone, before the host stood its mechanisms in: what the gallery draws. */
  face: FaceDocument;
  /** The namespace of the addon's shared faces, and the looks this screen contributes to it. */
  facesNamespace: string;
  faces: Record<string, Control>;
  /** The screen as faces alone under its preview namespace, for the gallery. */
  preview: Preview;
  /** Every entry the runtime has to emit, in order. The nth is `response.selection` n. */
  entries: readonly EntryEntry[];
  /**
   * What the build baked, for the generated module to register beside the
   * title: the carried-visible ordinals the runtime re-marks, and the shape
   * and baked strings `debug` diffs a render against.
   */
  snapshot: CompiledSnapshot;
  hasBackdrop: boolean;
  /**
   * The screen as a table, when nothing about it can change: the value each
   * entry carries and where each press leads. Present means the shipped addon
   * needs no component for this screen — the build knows the whole of what
   * showing it requires.
   */
  table?: StaticScreen;
}

/** Namespaces are dotted into references, so a name is an identifier, not a path. */
const NAME = /^[A-Za-z0-9_-]+$/;

/**
 * Where the action form put a built tree's needs: every one is an entry, and
 * an entry is the same thing whichever it carries — a press's index, a live
 * string, or a carried visible's bool.
 */
const actionAddressing = (entries: readonly EntryEntry[]): Addressing => ({
  cells: new Map(entries
    .filter(entry => entry.role !== undefined)
    .map(entry => [entry.element, { address: entry.entry, role: entry.role ?? 'button' }] as const)),
  channels: new Map(entries
    .filter(entry => entry.carrier === 'text' || entry.carrier === 'int' || entry.carrier === 'texture')
    .map(entry => [entry.element, { address: entry.entry, length: entry.length ?? 0 }])),
  visibles: new Map(entries
    .filter(entry => entry.carrier === 'bool')
    .map(entry => [entry.element, entry.entry])),
});

/**
 * Where the modal put the same needs: `custom_form` rows rather than
 * `form_buttons` entries, from the SAME function the runtime writes rows
 * with, so a baked `collection_index` and a `formValues` slot cannot drift.
 * A screen is one or the other; the two numberings never meet in one map.
 */
const modalAddressing = (rows: readonly ModalRow[]): Addressing => ({
  cells: new Map(rows
    .filter(row => row.kind === 'field')
    .map(row => [row.element, { address: row.row, role: 'button' as const }])),
  channels: new Map(rows
    .filter(row => row.kind === 'text' || row.kind === 'int' || row.kind === 'texture')
    .map(row => [row.element, { address: row.row, length: row.length ?? 0 }])),
  visibles: new Map(rows
    .filter(row => row.kind === 'bool')
    .map(row => [row.element, row.row])),
});

/**
 * The element whose rect is the canvas.
 *
 * A form has no marker root the way a container screen has `<Container>`, so
 * the canvas is whatever the author rendered — looked at through the providers
 * and fragments the build leaves above it. More than one concrete root has no
 * canvas to be relative to, which is a screen the compiler cannot place.
 */
const formRoot = (tree: ReturnType<typeof buildScreenOnce>): ReturnType<typeof buildScreenOnce> => {
  const roots = concreteRoots(tree);
  const [root] = roots;

  if (roots.length !== 1 || root === undefined) {
    throw new ContainerScreenError(
      `A compiled form must render exactly one element at its root; this one renders ${roots.length}.\n`
      + '  Wrap the screen in a single `<Panel>`: it is the box every rect below it is measured from.',
    );
  }

  return root;
};

/**
 * Compiles one form screen.
 *
 * @param Screen - The screen component itself, not the result of calling it.
 * @param spec - The screen's name and the addon namespace it is emitted under.
 * @throws ContainerScreenError when the spec or the tree breaks the form's rules.
 */
export function compileFormScreen(Screen: FunctionComponent, spec: FormScreenSpec): CompiledFormScreen {
  for (const part of [spec.namespace, spec.name]) {
    if (!NAME.test(part)) {
      throw new ContainerScreenError(
        `"${part}" cannot name a screen: it becomes part of the JSON UI namespace `
        + `${spec.namespace}_${spec.name}, which allows letters, digits, "_" and "-" only.`,
      );
    }
  }

  const namespace = `${spec.namespace}_${spec.name}`;

  // A compiled form is as baked as a compiled chest screen, so the same
  // question applies — and the same answer fails the build. What differs is
  // `visible`: the form has a carrier for it, so a probe that moved one is a
  // finding rather than an error.
  const probe = probeLiveness(() => buildScreenOnce(Screen));

  checkLiveness(probe, spec.name, { carriedVisible: true });

  const tree = buildScreenOnce(Screen);
  const visibles = visiblesAt(tree, probe.liveVisibles);
  const host = hostFor(tree);

  if (host.id === 'chest') {
    throw new ContainerScreenError('`<Container>` is a container screen; compile it with compileScreen().');
  }

  const modal = host.id === 'form-modal';
  const embedded = embedPlacementOf(tree);

  if (embedded !== undefined && modal) {
    throw new ContainerScreenError('An embedded screen is drawn into an action form; it cannot be a <Form> modal.');
  }

  // The action form's needs are entries; the modal's are rows. One tree is
  // exactly one of the two, and each side of the branch is the same function
  // its runtime writes with — the numbering cannot drift from the bake.
  const entries = modal ? [] : allocateForm(tree, analyze(tree, visibles)).entries;
  // A screen with nothing live is shown from a table rather than from a
  // component. A modal is never one: its fields are the engine's, built per
  // present, so there is always something for the runtime to do.
  const read = modal ? { reason: 'a modal builds its fields per present' } : staticTable(entries, spec.namespace);
  const table = 'reason' in read ? undefined : read;

  if (table === undefined && wantsStatic(tree)) {
    const why = 'reason' in read ? read.reason : 'it is not static';

    throw new ContainerScreenError(
      `"${spec.name}" declares \`<Screen static>\`, but ${why}.\n`
      + '  A static screen is shown from what the build knows — its title, its baked values and'
      + '  the key each press leads to — so it can carry no live value and no handler of its\n'
      + '  own. Drop the marker, or make every press a link and every string baked.',
    );
  }

  const addressing = modal ? modalAddressing(allocateModal(tree, visibles)) : actionAddressing(entries);
  const ir = toIr(formRoot(tree), addressing, {
    namespace,
    faces: facesNamespaceOf(spec.namespace),
    collection: modal ? MODAL_COLLECTION : FORM_COLLECTION,
  });
  const face = faceOf(ir);
  const document = fill(face, FORM_EMIT);

  return {
    name: spec.name,
    addon: spec.namespace,
    namespace,
    title: formTitleFor(namespace),
    ...embedded === undefined ? {} : { marker: embedMarker(spec.namespace), embed: embedded },
    document,
    face,
    facesNamespace: face.facesNamespace,
    faces: face.faces,
    preview: previewOf(ir),
    entries,
    snapshot: {
      // Carrier-aware: the bool channels are in the fingerprint, so a runtime
      // whose visibles do not match the bake diffs loudly in `debug`.
      shape: shapeOf(tree, analyze(tree, visibles)),
      baked: bakedTexts(tree),
      vis: probe.liveVisibles,
    },
    ...table === undefined ? {} : { table },
    hasBackdrop: document[BACKDROP_DEFINITION] !== undefined,
  };
}

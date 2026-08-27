import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import {
  allocateForm, buildScreenOnce, concreteRoots, ContainerScreenError, FORM_COLLECTION,
  formTitleFor, probeLiveness, type EntryEntry,
} from '@bedrock-core/ui-runtime/compile';
import { checkLiveness } from '../../compile';
import { BACKDROP_DEFINITION, emit } from '../../emit';
import type { Document } from '../../jsonui';
import type { Addressing } from '../../nodes/types';
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
  /** The JSON UI document: `screen` (+ `backdrop`) and its shared definitions. */
  document: Document;
  /** Every entry the runtime has to emit, in order. The nth is `response.selection` n. */
  entries: readonly EntryEntry[];
  hasBackdrop: boolean;
}

/** Namespaces are dotted into references, so a name is an identifier, not a path. */
const NAME = /^[A-Za-z0-9_-]+$/;

/**
 * Where the form put a built tree's cells and channels: both are entries, and
 * an entry is the same thing whichever it carries.
 */
const formAddressing = (entries: readonly EntryEntry[]): Addressing => ({
  cells: new Map(entries
    .filter(entry => entry.role !== undefined)
    .map(entry => [entry.element, { address: entry.entry, role: entry.role ?? 'button' }])),
  channels: new Map(entries
    .filter(entry => entry.length !== undefined)
    .map(entry => [entry.element, { address: entry.entry, length: entry.length ?? 0 }])),
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
  // question applies — and the same answer fails the build.
  checkLiveness(probeLiveness(() => buildScreenOnce(Screen)), spec.name);

  const tree = buildScreenOnce(Screen);
  const placement = allocateForm(tree);
  const document = emit(
    toIr(formRoot(tree), formAddressing(placement.entries), { namespace, collection: FORM_COLLECTION }),
    FORM_EMIT,
  );

  return {
    name: spec.name,
    addon: spec.namespace,
    namespace,
    title: formTitleFor(namespace),
    document,
    entries: placement.entries,
    hasBackdrop: document[BACKDROP_DEFINITION] !== undefined,
  };
}

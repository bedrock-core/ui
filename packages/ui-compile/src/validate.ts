/**
 * The rules a face document has to obey before any host sees it.
 *
 * Every one is a measured engine rule that only holds for static trees, which
 * is why it is checked here, once, with no host in the loop
 * ([10-faces-and-hosts](../docs/10-faces-and-hosts.md)):
 *
 *  1. A face carries no binding that reads a host. A `view` binding between
 *     siblings is the client's own (a disclosure reading its toggle) and is
 *     the one kind allowed; anything over a collection, the title or a global
 *     is a mechanism, and a mechanism is the host's to stand in.
 *  2. `keep_ratio: false` on every image: an image preserves its texture's
 *     aspect ratio by default, so a stretched image renders narrower than the
 *     box the layout solved for it.
 *  3. `localize` set on every label: labels localize by default, and a
 *     literal that happens to look like a key renders as its translation.
 *  4. Sibling names are unique: two entries of one name in one `controls` list
 *     draw one of them.
 *  5. Every reference into the screen's own namespace or the addon's faces
 *     resolves, and so does every `source_control_name`. An unresolvable name
 *     is an assertion in the client, and so a Marketplace rejection.
 */

import { ContainerScreenError } from '@bedrock-core/ui-runtime/compile';
import type { Binding, Control, Document } from './jsonui';

const refuse = (where: string, rule: string): never => {
  throw new ContainerScreenError(`Face "${where}": ${rule}`);
};

/** A binding the client resolves among siblings; nothing else belongs in a face. */
const isLocal = (binding: Binding): boolean =>
  binding.binding_type === 'view' && binding.source_control_name !== undefined
  && binding.binding_collection_name === undefined && binding.binding_name === undefined;

/** Every control name in a document, at any depth: what a `source_control_name` may name. */
const controlNames = (control: Control, into: Set<string>): Set<string> => {
  for (const entry of control.controls ?? []) {
    for (const [key, child] of Object.entries(entry)) {
      into.add(key.split('@')[0] ?? '');
      controlNames(child, into);
    }
  }

  return into;
};

const checkControl = (where: string, control: Control, ns: string, facesNs: string, known: ReadonlySet<string>, controls: ReadonlySet<string>): void => {
  for (const binding of control.bindings ?? []) {
    if (!isLocal(binding)) {
      refuse(where, `a face carries no binding that reads a host (${JSON.stringify(binding)}).`);
    }

    const source = binding.source_control_name;

    if (source !== undefined && !controls.has(source)) {
      refuse(
        where,
        `it reads "${source}", which no control on this screen is called. `
        + 'An unresolved name is an assertion in the client, not a binding that quietly does nothing.',
      );
    }
  }

  if (control.type === 'image' && control.keep_ratio !== false) {
    refuse(where, 'an image face sets keep_ratio: false, or it renders narrower than its box.');
  }

  if (control.type === 'label' && control.localize === undefined) {
    refuse(where, 'a label face says whether it localizes.');
  }

  const names = new Set<string>();

  for (const entry of control.controls ?? []) {
    for (const [key, child] of Object.entries(entry)) {
      const [name, base] = key.split('@');

      if (name === undefined || name === '') {
        refuse(where, 'every control is named.');
      }

      if (names.has(name)) {
        refuse(where, `two children are named "${name}"; one of them would not draw.`);
      }

      names.add(name);

      if (base !== undefined) {
        const [refNs, refName] = base.split('.');

        if ((refNs === ns || refNs === facesNs) && (refName === undefined || !known.has(`${refNs}.${refName}`))) {
          refuse(`${where}/${name}`, `references "${base}", which nothing defines.`);
        }
      }

      checkControl(`${where}/${name}`, child, ns, facesNs, known, controls);
    }
  }
};

const definitions = (document: Document): [string, Control][] => Object.entries(document)
  .filter((entry): entry is [string, Control] => typeof entry[1] !== 'string' && !('modifications' in entry[1]));

/**
 * Checks a face document and the faces it shares against the rules above.
 *
 * @param document - The screen's face document.
 * @param faces - The addon faces it references.
 * @param ns - The screen's namespace.
 * @param facesNs - The faces' namespace.
 * @throws ContainerScreenError naming the control and the rule it breaks.
 */
export const validateFace = (document: Document, faces: Record<string, Control>, ns: string, facesNs: string): void => {
  const known = new Set<string>([
    ...definitions(document).map(([name]) => `${ns}.${name.split('@')[0] ?? ''}`),
    ...Object.keys(faces).map(name => `${facesNs}.${name}`),
  ]);

  // Every name in the screen, since a `source_control_name` is looked up
  // screen-wide: the reader and its source are rarely siblings by the time the
  // layout has put each of them in a row of its own.
  const controls = new Set<string>();

  for (const [name, control] of definitions(document)) {
    controls.add(name.split('@')[0] ?? '');
    controlNames(control, controls);
  }

  for (const [name, control] of Object.entries(faces)) {
    controls.add(name);
    controlNames(control, controls);
  }

  for (const [name, control] of definitions(document)) {
    checkControl(name, control, ns, facesNs, known, controls);
  }

  for (const [name, control] of Object.entries(faces)) {
    checkControl(`${facesNs}.${name}`, control, ns, facesNs, known, controls);
  }
};

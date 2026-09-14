/**
 * The face document -> the screen a host serves.
 *
 * The second of the two passes ([faces and hosts](../../../docs/README.md#faces-and-hosts)).
 * The host receives every socket's face entry, in document order, and hands
 * back the control that stands in its place: a wrapper around the face (a
 * gate, an index host) or a replacement for it (a cell over a container
 * slot). Whatever it hands back keeps the face's placement — size, offset,
 * anchors, layer — and the build refuses one that does not. Nothing outside
 * the sockets is touched.
 *
 * Rules the mechanisms obey, all measured:
 *
 *  1. THE HOST RULE. `collection_index` is accepted only on a direct child of a
 *     control declaring `collection_name`, and `collection_name` is legal only
 *     on `stack_panel` and `grid`. So anything that reads a slot gets a
 *     one-child `stack_panel` host directly above it. The host carries the
 *     solved offset, the child carries the index.
 *  2. NO VARIABLES IN BINDINGS. A `$var` inside `source_property_name` kills the
 *     property outright in a subtree inserted through `modifications`. Every
 *     number in a binding is baked as a literal, which also means no shared,
 *     parameterised control can own a binding — hence one definition per
 *     binding SHAPE, with references supplying what varies.
 */

import { ContainerScreenError } from '@bedrock-core/ui-runtime/compile';
import { type FaceDocument, SCREEN_DEFINITION } from './face';
import type { Control, ControlEntry, Document } from './jsonui';
import { entryControl, placementOf } from './nodes/utils/shared';
import type { Emit, HostEmit, Socket } from './nodes/utils/types';

/** Where an entry was found: the list it sits in and its position, or the document itself. */
type Found
  = | { readonly kind: 'control'; readonly list: ControlEntry[]; readonly index: number; readonly key: string }
    | { readonly kind: 'definition'; readonly key: string };

const nameOf = (key: string): string => key.split('@')[0] ?? '';

const findIn = (list: ControlEntry[], name: string): Found | undefined => {
  for (const [index, entry] of list.entries()) {
    for (const [key, control] of Object.entries(entry)) {
      if (nameOf(key) === name) {
        return { kind: 'control', list, index, key };
      }

      const inner = control.controls === undefined ? undefined : findIn(control.controls, name);

      if (inner !== undefined) {
        return inner;
      }
    }
  }

  return undefined;
};

/**
 * Where a node's control is: a definition of its own (a scroll's content, a
 * list a scroll took as its content), or an entry somewhere under one.
 */
const locate = (document: Document, name: string): Found => {
  for (const key of Object.keys(document)) {
    if (nameOf(key) === name && typeof document[key] !== 'string') {
      return { kind: 'definition', key };
    }
  }

  for (const [, value] of Object.entries(document)) {
    if (typeof value === 'string' || 'modifications' in value) {
      continue;
    }

    const found = value.controls === undefined ? undefined : findIn(value.controls, name);

    if (found !== undefined) {
      return found;
    }
  }

  throw new Error(`The face document has no control named "${name}" for a socket to fill.`);
};

const isControl = (value: Document[string]): value is Control => typeof value !== 'string' && !('modifications' in value);

const entryAt = (document: Document, found: Found): ControlEntry => {
  if (found.kind === 'definition') {
    const control = document[found.key];

    if (control === undefined || !isControl(control)) {
      throw new Error(`"${found.key}" is not a definition.`);
    }

    return { [found.key]: control };
  }

  const entry = found.list[found.index];

  if (entry === undefined) {
    throw new Error('unreachable: a located entry is in its list');
  }

  return entry;
};

const replaceAt = (document: Document, found: Found, entry: ControlEntry): void => {
  if (found.kind === 'definition') {
    const [key] = Object.keys(entry);

    if (key !== found.key) {
      delete document[found.key];
    }

    Object.assign(document, entry);

    return;
  }

  found.list[found.index] = entry;
};

/**
 * The placement a mechanism keeps. A gate's wrapper is sized to what it holds
 * so a stack can fold it, and the size it must keep is its gate's.
 */
const kept = (socket: Socket, entry: ControlEntry): Record<string, unknown> => {
  const control = entryControl(entry);
  const gate = socket.kind === 'visible' ? control.controls?.[0]?.gate : undefined;

  return placementOf(gate === undefined ? control : { ...control, size: gate.size });
};

/**
 * The one thing a host may not do: move a socket. The face's placement is the
 * layout's, signed off before any host touched the screen.
 */
const guard = (socket: Socket, before: ControlEntry, after: ControlEntry, host: HostEmit): void => {
  const was = placementOf(entryControl(before));
  const now = kept(socket, after);

  if (JSON.stringify(was) !== JSON.stringify(now)) {
    throw new ContainerScreenError(
      `The ${host.id} host moved "${socket.node.name}" while standing its ${socket.kind} in:\n`
      + `    face: ${JSON.stringify(was)}\n`
      + `    host: ${JSON.stringify(now)}\n`
      + '  A host wraps or replaces a face; the placement is the layout\'s.',
    );
  }
};

/**
 * Fills a face document's sockets with one host's mechanisms.
 *
 * @param face - The screen as faces, untouched by this call.
 * @param host - The screen it is served on.
 * @returns The screen document the host serves.
 */
export const fill = (face: FaceDocument, host: HostEmit, title = ''): Document => {
  // The face document stays what it is — the gallery draws it — so the host
  // works on a copy.
  const document = structuredClone(face.document);
  const context: Emit = {
    ns: face.namespace,
    facesNs: face.facesNamespace,
    collection: face.collection,
    screen: title,
    host,
    ...face.ownedRenderer === undefined ? {} : { ownedRenderer: face.ownedRenderer },
    faceNames: new Map(),
    textNames: new Map(),
    defs: {},
  };

  host.assemble?.(face.root, document, context);

  for (const socket of face.sockets) {
    const found = locate(document, socket.node.name);
    const entry = entryAt(document, found);
    const mechanism = socket.kind === 'visible' ? host.wrapVisible : host.fill[socket.kind];

    if (mechanism === undefined) {
      throw new ContainerScreenError(
        `The ${host.id} host has no mechanism for the ${socket.kind} of "${socket.node.name}" (<${socket.node.kind}>).`,
      );
    }

    const filled = mechanism(socket.node, entry, context);

    guard(socket, entry, filled, host);
    replaceAt(document, found, filled);
  }

  const screen = document[SCREEN_DEFINITION];

  if (screen === undefined || !isControl(screen)) {
    throw new Error('unreachable: a face document has a screen');
  }

  screen.controls = [
    ...host.chrome?.() ?? [],
    ...screen.controls ?? [],
    ...host.overlay?.(face.root, context) ?? [],
  ];

  Object.assign(document, context.defs);

  return document;
};

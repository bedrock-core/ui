/**
 * The face document -> the screen a host serves.
 *
 * The second of the two passes ([faces and hosts](../../../docs/README.md#faces-and-hosts)).
 * The host receives every socket's face entry, in document order, and hands
 * back the control that stands in its place: a wrapper around the face (a
 * gate, an index host) or a replacement for it (a cell over a container
 * slot). Whatever it hands back keeps the face's placement — size, offset,
 * anchors, layer — and the build refuses one that does not. Nothing outside
 * the sockets is touched during filling. A final pass collapses transparent
 * layout panels whose children can keep their absolute placement, then uses
 * native stacks for contiguous rows and columns that need no extra controls.
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
import { collapsePanels } from './collapse';
import { ControlIndex } from './control-index';
import { groupRootHelpers } from './traversal';
import { type FlowPanel, flowPanel, flowPanels } from './flow';
import { type FaceDocument, SCREEN_DEFINITION } from './face';
import type { Control, ControlEntry, Document } from './jsonui';
import { childrenOf } from './nodes';
import { entryControl, placementOf } from './nodes/utils/shared';
import type { Emit, HostEmit, IrNode, Socket } from './nodes/utils/types';

const isControl = (value: Document[string]): value is Control => typeof value !== 'string' && !('modifications' in value);

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
  // The face document stays what it is — one face pass feeds every host that
  // serves the screen — so the host works on a copy.
  const document = structuredClone(face.document);
  const context: Emit = {
    ns: face.namespace,
    facesNs: face.facesNamespace,
    collection: face.collection,
    screen: title,
    host,
    faceNames: new Map(),
    textNames: new Map(),
    defs: {},
  };

  host.assemble?.(face.root, document, context);

  const controls = new ControlIndex(document, new Set(face.sockets.map(socket => socket.node.name)));

  for (const socket of face.sockets) {
    controls.replace(socket.node.name, (entry) => {
      const mechanism = socket.kind === 'visible'
        ? host.wrapVisible
        : socket.kind === 'look' ? host.wrapLook : host.fill[socket.kind];

      if (mechanism === undefined) {
        throw new ContainerScreenError(
          'The ' + host.id + ' host has no mechanism for the ' + socket.kind + ' of "' + socket.node.name + '" (<' + socket.node.kind + '>).',
        );
      }

      const filled = mechanism(socket.node, entry, context);

      guard(socket, entry, filled, host);

      return filled;
    });
  }

  const screen = document[SCREEN_DEFINITION];

  if (screen === undefined || !isControl(screen)) {
    throw new Error('unreachable: a face document has a screen');
  }

  screen.controls = [
    ...host.chrome?.() ?? [],
    ...context.rootControls ?? [],
    ...screen.controls ?? [],
    ...host.overlay?.(face.root, context) ?? [],
  ];

  Object.assign(document, context.defs);

  const panels = new Set<string>();
  const flows = new Map<string, FlowPanel>();

  const collect = (node: IrNode): void => {
    const flow = node.kind === 'panel' ? flowPanel(node) : undefined;

    if (flow !== undefined) {
      flows.set(node.name, flow);
    }

    if (node.kind === 'panel' && node.id === undefined && node.background === undefined
      && node.native === undefined && node.stack === undefined && node.visible === undefined
      && node.carriedVisible === undefined && node.carriedLook === undefined
      && node.lookGate === undefined && node.follows === undefined && flow?.items === undefined) {
      panels.add(node.name);
    }

    childrenOf(node).forEach(collect);
  };

  collect(face.root);

  const result = flowPanels(collapsePanels(document, panels), flows);
  const root = result[SCREEN_DEFINITION];

  if (root !== undefined && isControl(root)) { groupRootHelpers(root, context.ns); }

  return result;
};

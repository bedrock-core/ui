/**
 * The node kinds, and the generic traversals over them.
 *
 * Definition ORDER is part of the output: document-level assembly runs in
 * this order, which is what fixes where one kind's definitions land relative
 * to another's in the emitted document.
 */

import { buttonDefinition } from './primitives/button';
import { disclosureDefinition, disclosureHeaderDefinition } from './compositions/disclosure';
import { embedDefinition } from './primitives/embed';
import { fieldDefinition } from './primitives/field';
import { gridDefinition } from './primitives/grid';
import { imageDefinition } from './primitives/image';
import { listDefinition } from './primitives/list';
import { panelDefinition } from './primitives/panel';
import { scrollDefinition } from './primitives/scroll';
import { slotDefinition } from './primitives/slot';
import { tabDefinition, tabsDefinition } from './compositions/tabs';
import { textDefinition } from './primitives/text';
import type { IrNode, NodeDefinition, Socket, SocketKind } from './utils/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each entry is narrowed by its own kind
export const NODE_DEFINITIONS: readonly NodeDefinition<any>[] = [
  panelDefinition,
  textDefinition,
  imageDefinition,
  slotDefinition,
  gridDefinition,
  buttonDefinition,
  scrollDefinition,
  tabsDefinition,
  tabDefinition,
  disclosureDefinition,
  disclosureHeaderDefinition,
  listDefinition,
  fieldDefinition,
  embedDefinition,
];

const byKind = new Map<string, NodeDefinition>(NODE_DEFINITIONS.map(definition => [definition.kind, definition]));

const byType = new Map<string, NodeDefinition>(
  NODE_DEFINITIONS.flatMap(definition => (definition.types ?? []).map(type => [type, definition] as const)),
);

/** The definition that draws a node kind. Every IR kind has one by construction. */
export const definitionFor = (kind: IrNode['kind']): NodeDefinition => {
  const definition = byKind.get(kind);

  if (definition === undefined) {
    throw new Error(`No node definition draws "${kind}".`);
  }

  return definition;
};

/** The definition that lowers a JSX host type, or undefined when no kind claims it. */
export const loweringFor = (type: string): NodeDefinition | undefined =>
  byType.get(type) ?? NODE_DEFINITIONS.find(definition => definition.matches?.(type) === true);

/** A node's IR children, for a definition that has them. */
export const childrenOf = (node: IrNode): IrNode[] => definitionFor(node.kind).children?.(node) ?? [];

/** The mechanism a node's kind declares it needs from its host, if any. */
export const socketOf = (node: IrNode): Exclude<SocketKind, 'visible'> | undefined =>
  definitionFor(node.kind).socket?.(node);

/**
 * Every mechanism one node needs, in the order a host must supply them.
 *
 * A carried `visible` comes FIRST and is not declared by the kind, because it
 * is not about what the node is: any node at all can have its visibility
 * carried, and the gate wraps whatever the node turned out to be. So the
 * subtree is gated before anything inside it is filled, and the host finds the
 * inner sockets inside its own wrapper by name.
 */
export const socketsOf = (node: IrNode): Socket[] => {
  const own = socketOf(node);

  return [
    ...node.carriedVisible === undefined ? [] : [{ node, kind: 'visible' as const }],
    ...own === undefined ? [] : [{ node, kind: own }],
  ];
};

const isKind = <K extends IrNode['kind']>(node: IrNode, kind: K): node is Extract<IrNode, { kind: K }> =>
  node.kind === kind;

/** Every node of a kind, in document order, buttons' faces included. */
export const collectKind = <K extends IrNode['kind']>(
  node: IrNode,
  kind: K,
  into: Extract<IrNode, { kind: K }>[] = [],
): Extract<IrNode, { kind: K }>[] => {
  if (isKind(node, kind)) {
    into.push(node);
  }

  for (const child of childrenOf(node)) {
    collectKind(child, kind, into);
  }

  return into;
};

/**
 * A node with its names stripped, so two nodes that draw the same thing
 * compare equal. Names only have to be unique within their parent, and a
 * shared definition supplies its own.
 */
export const shapeOf = (node: IrNode): unknown => {
  const { name: _name, ...shape } = node;

  if (definitionFor(node.kind).children !== undefined) {
    return { ...shape, children: childrenOf(node).map(shapeOf) };
  }

  return shape;
};

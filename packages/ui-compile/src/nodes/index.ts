/**
 * The node kinds, and the generic traversals over them.
 *
 * Definition ORDER is part of the output: document-level assembly runs in
 * this order, which is what fixes where one kind's definitions land relative
 * to another's in the emitted document.
 */

import { buttonDefinition } from './button';
import { disclosureDefinition, disclosureHeaderDefinition } from './disclosure';
import { embedDefinition } from './embed';
import { exitDefinition } from './exit';
import { fieldDefinition } from './field';
import { gridDefinition } from './grid';
import { imageDefinition } from './image';
import { labelDefinition } from './label';
import { listDefinition } from './list';
import { modalButtonDefinition } from './modalButton';
import { panelDefinition } from './panel';
import { scrollDefinition } from './scroll';
import { slotDefinition } from './slot';
import { tabDefinition, tabsDefinition } from './tabs';
import { textDefinition } from './text';
import type { IrNode, NodeDefinition, SocketKind } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each entry is narrowed by its own kind
export const NODE_DEFINITIONS: readonly NodeDefinition<any>[] = [
  panelDefinition,
  labelDefinition,
  textDefinition,
  imageDefinition,
  slotDefinition,
  gridDefinition,
  buttonDefinition,
  exitDefinition,
  scrollDefinition,
  tabsDefinition,
  tabDefinition,
  disclosureDefinition,
  disclosureHeaderDefinition,
  listDefinition,
  fieldDefinition,
  modalButtonDefinition,
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

/** The mechanism a node needs from its host, if any. */
export const socketOf = (node: IrNode): Exclude<SocketKind, 'visible'> | undefined =>
  definitionFor(node.kind).socket?.(node);

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

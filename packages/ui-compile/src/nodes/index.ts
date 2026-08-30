/**
 * The node kinds, and the generic traversals over them.
 *
 * Definition ORDER is part of the output: shared definitions and document-level
 * assembly run in this order, which is what fixes where a text channel's
 * definitions land relative to a slot's in the emitted document.
 */

import type { Control, ControlEntry } from '../jsonui';
import { buttonDefinition } from './button';
import { exitDefinition } from './exit';
import { fieldDefinition } from './field';
import { gridDefinition } from './grid';
import { imageDefinition } from './image';
import { labelDefinition } from './label';
import { modalButtonDefinition } from './modalButton';
import { panelDefinition } from './panel';
import { scrollDefinition } from './scroll';
import { slotDefinition } from './slot';
import { tabDefinition, tabsDefinition } from './tabs';
import { textDefinition } from './text';
import type { Emit, IrNode, NodeDefinition } from './types';

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
  fieldDefinition,
  modalButtonDefinition,
];

const byKind = new Map<string, NodeDefinition>(NODE_DEFINITIONS.map(definition => [definition.kind, definition]));

const byType = new Map<string, NodeDefinition>(
  NODE_DEFINITIONS.flatMap(definition => (definition.types ?? []).map(type => [type, definition] as const)),
);

/** The definition that emits a node kind. Every IR kind has one by construction. */
export const definitionFor = (kind: IrNode['kind']): NodeDefinition => {
  const definition = byKind.get(kind);

  if (definition === undefined) {
    throw new Error(`No node definition emits "${kind}".`);
  }

  return definition;
};

/** The definition that lowers a JSX host type, or undefined when no kind claims it. */
export const loweringFor = (type: string): NodeDefinition | undefined =>
  byType.get(type) ?? NODE_DEFINITIONS.find(definition => definition.matches?.(type) === true);

/** A node's IR children, for a definition that has them. */
const childrenOf = (node: IrNode): IrNode[] => definitionFor(node.kind).children?.(node) ?? [];

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

/** The shared-definition shapes a tree needs, gathered from every node. */
export const collectShapes = (node: IrNode, into: Set<string>): void => {
  const definition = definitionFor(node.kind);

  definition.shapes?.(node, into);

  for (const child of childrenOf(node)) {
    collectShapes(child, into);
  }
};

/**
 * Definitions shared by every node of a given shape. Emitted only when the tree
 * actually contains one, so a screen with no bars carries no bar definitions.
 */
export const sharedDefs = (ns: string, collection: string, kinds: Set<string>): Record<string, Control> => {
  const defs: Record<string, Control> = {};

  for (const definition of NODE_DEFINITIONS) {
    Object.assign(defs, definition.sharedDefs?.(ns, collection, kinds));
  }

  return defs;
};

/**
 * One node becomes one entry in its parent's `controls`.
 *
 * The host draws the kinds whose mechanism is its own — a button is a
 * container slot on one screen and a form entry on another — and everything it
 * does not claim emits its look, which is the same wherever it is drawn.
 */
export const emitNode = (node: IrNode, ctx: Emit): ControlEntry => {
  // A carried visible wraps whatever the node emits: the host owns the gate
  // (which collection, which binding), the node stays ignorant of it. The
  // host re-enters through `ctx.emitNode` with `visibleEntry` cleared, so
  // this branch runs at most once per node.
  if (node.visibleEntry !== undefined && ctx.host.wrapVisible !== undefined) {
    return ctx.host.wrapVisible(node, ctx);
  }

  const mechanism = ctx.host.emit?.[node.kind];

  return mechanism === undefined ? definitionFor(node.kind).emit(node, ctx) : mechanism(node, ctx);
};

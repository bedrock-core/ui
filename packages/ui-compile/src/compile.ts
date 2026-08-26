/**
 * The whole compiler, end to end: a screen component in, a JSON UI document
 * out, plus the counts the filter reports and stamps. The router that reaches
 * every compiled screen is built from the same results.
 */

import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import {
  allocate, buildContainerTree, ContainerScreenError, MAX_LAYOUT,
} from '@bedrock-core/ui-runtime/compile';
import { BACKDROP_DEFINITION, emit } from './emit';
import { CHEST_HOST, type ChestHost, chestRouter } from './hosts/chest';
import type { Allocation } from './ir';
import type { Document } from './jsonui';
import { toIr } from './toIr';

export interface ScreenSpec {
  /** Screen name from the file name, e.g. `furnace`. */
  name: string;
  /**
   * The addon's namespace, e.g. `core`. The screen is emitted into the JSON UI
   * namespace `<namespace>_<name>`, so an addon's screens carry its own name
   * rather than the library's. Defaults to `core_ui`.
   */
  namespace?: string;
  /** 1..MAX_LAYOUT, assigned by the filter. */
  layoutId: number;
}

/** The default namespace prefix when a spec names none. */
const DEFAULT_NAMESPACE = 'core_ui';

export interface CompiledScreen {
  name: string;
  namespace: string;
  layoutId: number;
  /** The entity type the screen's `<Container>` names. */
  entity: string;
  /** The JSON UI document: `screen` (+ `backdrop` when the screen has a Background) and its shared definitions. */
  document: Document;
  /** Counts the filter reports and stamps: drawn cells, bank slots, and the inventory size the entity needs. */
  allocation: Allocation;
  hasBackdrop: boolean;
  /** Whether any text channel exists, so the filter knows to emit the character table. */
  hasText: boolean;
}

/** Namespaces are dotted into references, so a name is an identifier, not a path. */
const NAME = /^[A-Za-z0-9_-]+$/;

const checkSpec = (spec: ScreenSpec): void => {
  const namespace = spec.namespace ?? DEFAULT_NAMESPACE;

  if (!NAME.test(namespace)) {
    throw new ContainerScreenError(
      `"${namespace}" cannot namespace a screen: it becomes part of the JSON UI namespace `
      + `${namespace}_${spec.name}, which allows letters, digits, "_" and "-" only.`,
    );
  }

  if (!NAME.test(spec.name)) {
    throw new ContainerScreenError(
      `"${spec.name}" cannot name a screen: it becomes the JSON UI namespace ${namespace}_${spec.name}, `
      + 'which allows letters, digits, "_" and "-" only.',
    );
  }

  if (!Number.isInteger(spec.layoutId) || spec.layoutId < 1 || spec.layoutId > MAX_LAYOUT) {
    throw new ContainerScreenError(
      `Layout id ${spec.layoutId} (${spec.name}) is outside 1..${MAX_LAYOUT}: the key rides the sentinel's `
      + 'durability, and readings past that mark a button\'s transport item.',
    );
  }
};

/**
 * Compiles one screen: build the tree, allocate its cells and channels, solve
 * the IR, emit JSON UI.
 *
 * @param Screen - The screen component. The component itself, not the result
 *   of calling it: hooks resolve against the build owner.
 * @param spec - The name and layout key the filter assigned.
 * @param host - The host the screen is served through. Defaults to the chest.
 * @throws ContainerScreenError when the spec or the tree breaks the container rules.
 * @throws UnsupportedNodeError for a control with no compiled form.
 */
export function compileScreen(
  Screen: FunctionComponent,
  spec: ScreenSpec,
  host: ChestHost = CHEST_HOST,
): CompiledScreen {
  checkSpec(spec);

  const namespace = `${spec.namespace ?? DEFAULT_NAMESPACE}_${spec.name}`;
  const tree = buildContainerTree(Screen);
  const allocation = allocate(tree);
  const ir = toIr(tree, allocation, { namespace, host });
  const document = emit(ir);

  return {
    name: spec.name,
    namespace,
    layoutId: spec.layoutId,
    entity: ir.entity,
    document,
    allocation: ir.allocation,
    hasBackdrop: document[BACKDROP_DEFINITION] !== undefined,
    hasText: allocation.channels.some(channel => channel.carrier === 'text'),
  };
}

/**
 * The router document that gates every compiled screen onto the host's vanilla
 * screen, in the host's own namespace.
 *
 * @param screens - Every compiled screen, in any order.
 * @param host - The host the screens were compiled for. Defaults to the chest.
 * @throws ContainerScreenError when a layout key is out of range or shared.
 */
export function buildRouter(screens: readonly CompiledScreen[], host: ChestHost = CHEST_HOST): Document {
  return chestRouter(screens, host);
}

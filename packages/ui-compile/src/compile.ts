/**
 * The whole compiler, end to end: a screen component in, a JSON UI document
 * out, plus the counts the filter reports and stamps. The router that reaches
 * every compiled screen is built from the same results.
 */

import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import {
  allocate, buildContainerTree, ContainerScreenError, layoutKey,
} from '@bedrock-core/ui-runtime/compile';
import { BACKDROP_DEFINITION, emit } from './emit';
import { CHEST_HOST, type ChestHost, chestRouter, type ChestRouting } from './hosts/chest';
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
}

/** The default namespace prefix when a spec names none. */
const DEFAULT_NAMESPACE = 'core_ui';

export interface CompiledScreen {
  name: string;
  /** The addon's namespace the screen was compiled under. */
  addon: string;
  /** The JSON UI namespace: `<addon>_<name>`. */
  namespace: string;
  /** The key the router picks this layout by: derived from the namespace, so it is the same on every build. */
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
};

/**
 * Compiles one screen: build the tree, allocate its cells and channels, solve
 * the IR, emit JSON UI.
 *
 * @param Screen - The screen component. The component itself, not the result
 *   of calling it: hooks resolve against the build owner.
 * @param spec - The screen's name and the addon namespace it is emitted under.
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

  const addon = spec.namespace ?? DEFAULT_NAMESPACE;
  const namespace = `${addon}_${spec.name}`;
  const tree = buildContainerTree(Screen);
  const allocation = allocate(tree);
  const ir = toIr(tree, allocation, { namespace, host });
  const document = emit(ir);

  return {
    name: spec.name,
    addon,
    namespace,
    layoutId: layoutKey(addon, spec.name),
    entity: ir.entity,
    document,
    allocation: ir.allocation,
    hasBackdrop: document[BACKDROP_DEFINITION] !== undefined,
    hasText: allocation.channels.some(channel => channel.carrier === 'text'),
  };
}

/**
 * The documents that route one addon's compiled screens onto the host's
 * vanilla screen: the hook, written into the vanilla file, and the addon's
 * router that the chest root gains by modification.
 *
 * @param screens - Every compiled screen of the addon, in any order.
 * @param host - The host the screens were compiled for. Defaults to the chest.
 * @throws ContainerScreenError when a layout key is out of range or shared, or the screens span addons.
 */
export function buildRouter(screens: readonly CompiledScreen[], host: ChestHost = CHEST_HOST): ChestRouting {
  const addon = screens[0]?.addon ?? DEFAULT_NAMESPACE;
  const foreign = screens.find(screen => screen.addon !== addon);

  if (foreign !== undefined) {
    throw new ContainerScreenError(
      `Screens "${screens[0]?.name}" (${addon}) and "${foreign.name}" (${foreign.addon}) belong to different addons; `
      + 'a router covers one addon.',
    );
  }

  return chestRouter(screens, addon, host);
}

/**
 * The whole compiler, end to end: a screen component in, a JSON UI document
 * out, plus the counts the filter reports and stamps. The router that reaches
 * every compiled screen is built from the same results.
 */

import type { FunctionComponent } from '@bedrock-core/ui-runtime';
import {
  allocate, buildContainerTree, buildScreenOnce, containerEntity, containerRoot,
  ContainerScreenError, layoutKey, probeLiveness, type Probe,
} from '@bedrock-core/ui-runtime/compile';
import { BACKDROP_DEFINITION, emit } from './emit';
import { CHEST_EMIT, CHEST_HOST, type ChestHost, chestRouter, type ChestRouting } from './hosts/chest';
import type { Allocation } from './ir';
import type { Document } from './jsonui';
import { chestAddressing, toIr } from './toIr';

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
 * What the build found moving, said in the author's terms.
 *
 * A compiled screen is baked, so a string that changes at runtime is not a
 * detail to warn about — it is a screen that will be wrong and will not say
 * so. The probe renders the component with each state slot perturbed, so
 * anything reported here really did change between two renders; the fix is
 * always the same, and the observed strings show what to size it for.
 */
export const checkLiveness = (probe: Probe, name: string): void => {
  if (probe.shape !== undefined) {
    throw new ContainerScreenError(
      `"${name}" renders a different screen when its state changes.\n`
      + '  A compiled screen is numbered once, at build time, so it cannot add, drop or\n'
      + '  reorder a cell afterwards. Change what a control SHOWS instead of whether it is\n'
      + '  there: `enabled` on a button, `visible` on a panel, `maxLength` on live text.\n'
      + `    was: ${probe.shape.before}\n`
      + `    now: ${probe.shape.after}`,
    );
  }

  if (probe.frozen.length === 0) {
    return;
  }

  const lines = probe.frozen.map(text =>
    `    "${text.before}" became "${text.after}" — needs maxLength={${text.longest}} or more`);

  throw new ContainerScreenError(
    `"${name}" has ${probe.frozen.length} <Text> that change${probe.frozen.length === 1 ? 's' : ''} with state but ${probe.frozen.length === 1 ? 'is' : 'are'} baked into the layout.\n`
    + '  Baked text is written into JSON UI at build time and never changes again, so the\n'
    + '  screen would show the build\'s string forever. Give each one `maxLength`, which\n'
    + '  reserves a container slot per character:\n'
    + lines.join('\n'),
  );
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

  // Before anything is baked: does this screen actually hold still? Everything
  // downstream assumes it does.
  checkLiveness(probeLiveness(() => buildScreenOnce(Screen)), spec.name);

  const tree = buildContainerTree(Screen);

  // The root and the entity are the CHEST's questions — what counts as a
  // screen's root differs per host, so the walk below is handed the answer
  // rather than asked to find it.
  const root = containerRoot(tree);
  const entity = containerEntity(root);

  if (entity === undefined || entity === '') {
    throw new ContainerScreenError('`<Container>` needs `entity`: the type of the entity the screen opens from.');
  }

  const allocation = allocate(tree);
  const ir = toIr(root, chestAddressing(allocation), {
    namespace,
    collection: host.collection,
    ownedItemRenderer: host.ownedItemRenderer,
  });
  const document = emit(ir, CHEST_EMIT);
  const drawn = allocation.slots.length;
  const counts: Allocation = {
    sentinels: allocation.sentinels.length,
    drawn,
    channels: allocation.size - allocation.sentinels.length - drawn,
    size: allocation.size,
  };

  return {
    name: spec.name,
    addon,
    namespace,
    layoutId: layoutKey(addon, spec.name),
    entity,
    document,
    allocation: counts,
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

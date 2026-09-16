import {
  type Block, type BlockDynamicPropertiesComponent, BlockComponentTypes, type Container,
  type Entity, EntityComponentTypes, type Vector3,
} from '@minecraft/server';
import type { ScreenHost } from '../../../core/events';
import { blockKey, blockOwner, entityOwner, type Owner } from '../../../core/fabric';
import { LAYOUT_PROPERTY } from '../contract';
import type { StateHost } from './store';

/**
 * The seam between a screen and the thing in the world that owns it.
 *
 * A container screen belongs to a custom ENTITY or a custom BLOCK, and the
 * session code is the same either way: it polls a container, persists hook
 * state, reads a layout key and hands a host to every handler. Those four
 * facts are all that differ, so they are answered here and the session never
 * asks which kind it is serving.
 *
 * Nothing is cached. A block in an unloaded chunk throws on `getComponent`, and
 * remembering that would leave the screen dead for the rest of the session even
 * after the chunk came back; an entity that died between two reads is the same
 * story. Every read is taken fresh and a failure reads as "not here right now".
 */

/** A read the engine throws on once its subject is out of reach. */
const readOr = <T>(read: () => T, fallback: T): T => {
  try {
    return read();
  } catch {
    return fallback;
  }
};

/** Whether a host is a block rather than an entity: a block has a permutation and no id. */
const isBlock = (host: ScreenHost): host is Block => 'permutation' in host;

/** One screen's host, as the session reads it. */
export interface HostTarget {
  readonly kind: 'entity' | 'block';
  /** What sessions and fibers are keyed by: an entity's id, a block's dimension and position. */
  readonly id: string;
  /** What every handler is handed, and what the screen's cells are read off. */
  readonly host: ScreenHost;
  /** The owner a render belongs to. */
  readonly owner: Owner;
  /**
   * What a message calls this host: an entity's type, and a block's type with
   * the dimension and position it stands at.
   */
  readonly label: string;
  /** Whether the host is still there and still reachable. */
  isValid(): boolean;
  /** The container behind the screen, or nothing while there is none. */
  container(): Container | undefined;
  /** The layout key the build stamped, or nothing when it stamped none. */
  layout(): number | undefined;
  /** Where the screen's hook state is persisted. */
  readonly store: StateHost;
  /** What to rebuild when the key is missing, said in the author's terms. */
  readonly stampHint: string;
  /** What the container's size is set from, for the message when it does not match. */
  readonly sizeHint: string;
}

/** The container of either kind of host, or nothing once it is out of reach. */
export const containerOf = (host: ScreenHost): Container | undefined => readOr(
  () => {
    if (!host.isValid) {
      return undefined;
    }

    return isBlock(host)
      ? host.getComponent(BlockComponentTypes.Inventory)?.container
      : host.getComponent(EntityComponentTypes.Inventory)?.container;
  },
  undefined,
);

/** The entity's target: its own id, its entity property, its own dynamic properties. */
const entityTarget = (entity: Entity): HostTarget => ({
  kind: 'entity',
  id: entity.id,
  host: entity,
  owner: entityOwner(entity),
  label: entity.typeId,
  isValid: () => readOr(() => entity.isValid, false),
  container: () => containerOf(entity),

  layout: (): number | undefined => {
    const value = readOr(() => entity.getProperty(LAYOUT_PROPERTY), undefined);

    return typeof value === 'number' ? value : undefined;
  },

  store: entity,
  stampHint: `${entity.typeId} has no \`${LAYOUT_PROPERTY}\` property`,
  sizeHint: 'The build sizes the entity\'s inventory to the screen',
});

/**
 * The block's target.
 *
 * Its key is where it stands, its layout key is a block state of the same name
 * the entity property has — declared by the build with the one value, since a
 * block has one screen — and its state lives in the block entity's own dynamic
 * properties, which the container and the block entity share a lifetime with.
 */
const blockTarget = (block: Block): HostTarget => {
  const properties = (): BlockDynamicPropertiesComponent | undefined => readOr(
    () => (block.isValid ? block.getComponent(BlockComponentTypes.DynamicProperties) : undefined),
    undefined,
  );

  const owner = blockOwner(block);

  return {
    kind: 'block',
    id: owner.id,
    host: block,
    owner,
    label: owner.id,
    isValid: () => readOr(() => block.isValid, false),
    container: () => containerOf(block),

    // The state's one value is a string (an integer state is stored by value
    // in the block's state bits, which a layout key overflows), so it is parsed.
    layout: (): number | undefined => {
      const states = readOr(() => block.permutation.getAllStates(), undefined);
      const value = states?.[LAYOUT_PROPERTY];
      const key = typeof value === 'string' ? Number(value) : value;

      return typeof key === 'number' && Number.isInteger(key) && key > 0 ? key : undefined;
    },

    // Re-read per call rather than held: the component is invalid the moment
    // the chunk unloads, and a held one would throw from then on.
    store: {
      getDynamicProperty: (identifier: string): boolean | number | string | Vector3 | undefined =>
        readOr(() => properties()?.get(identifier), undefined),

      setDynamicProperty: (identifier: string, value?: boolean | number | string | Vector3): void => {
        const component = properties();

        if (component === undefined) {
          throw new Error(
            `${blockKey(block)} has no \`${BlockComponentTypes.DynamicProperties}\` component. `
            + 'A block screen keeps its state there: give the block '
            + '`minecraft:block_entity: { "dynamic_properties": true }`.',
          );
        }

        component.set(identifier, value);
      },
    },

    stampHint: `${owner.id} has no \`${LAYOUT_PROPERTY}\` block state`,
    sizeHint: 'The build sizes the block\'s `minecraft:block_entity.container.slot_count` to the screen',
  };
};

/** The target for whatever the screen opened from. */
export const targetOf = (host: ScreenHost): HostTarget =>
  (isBlock(host) ? blockTarget(host) : entityTarget(host));

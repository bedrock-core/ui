import type { Entity, Player } from '@minecraft/server';
import { describe, expect, it, vi } from 'vitest';
import { Container } from '../../../components/Container';
import { Panel } from '../../../components/Panel';
import { Text } from '../../../components/Text';
import { buildContainerTree } from '../../../hosts/chest/build';
import { useEffect, useExit, usePlayer, useState } from '../../../hooks';
import type { JSX } from '../../../jsx';
import { BUILD_OWNER, entityOwner, getFibersForOwner, isContainerExit, playerOwner } from '../../fabric';
import { isElement } from '../../guards';
import { ContainerScreenError } from '../../types';
import { setStateSeed } from '../session';
import { buildTree, cleanupComponentTree } from '../tree';

/** The first label's string, wherever the tree put it. */
const firstText = (node: unknown): string | undefined => {
  if (!isElement(node)) {
    return undefined;
  }

  if (node.type === 'text') {
    const { value } = node.props;

    return typeof value === 'object' && value !== null && 'tail' in value && typeof value.tail === 'string'
      ? value.tail
      : undefined;
  }

  const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];

  for (const child of children) {
    const found = firstText(child);

    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
};

const Stateful = (): JSX.Element => {
  const [label] = useState('start');

  return Text({ children: label });
};

const Screen = (): JSX.Element => Container({ entity: 'core:test', children: [{ type: Stateful, props: {} }] });

describe('the build owner', () => {
  it('renders with initial state and leaves no fibers behind', () => {
    expect(firstText(buildContainerTree(Screen))).toBe('start');
    expect(getFibersForOwner(BUILD_OWNER)).toHaveLength(0);
  });

  it('rejects usePlayer, because one layout serves every player', () => {
    const PerPlayer = (): JSX.Element => {
      usePlayer();

      return Text({ children: 'never' });
    };
    const WithPlayer = (): JSX.Element => Container({ entity: 'core:test', children: [{ type: PerPlayer, props: {} }] });

    expect(() => buildContainerTree(WithPlayer)).toThrow(ContainerScreenError);
    expect(() => buildContainerTree(WithPlayer)).toThrow(/no player to read/);
  });

  it('hands useExit the client-side exit, the press that becomes a close button', () => {
    let exit: (() => void) | undefined;
    const Exiting = (): JSX.Element => {
      exit = useExit();

      return Text({ children: 'x' });
    };
    const WithExit = (): JSX.Element => Container({ entity: 'core:test', children: [{ type: Exiting, props: {} }] });

    buildContainerTree(WithExit);

    expect(isContainerExit(exit)).toBe(true);
    expect(() => exit?.()).not.toThrow();
  });

  it('does not run effects', () => {
    const effect = vi.fn();
    const Effectful = (): JSX.Element => {
      useEffect(effect);

      return Text({ children: 'x' });
    };
    const WithEffect = (): JSX.Element => Container({ entity: 'core:test', children: [{ type: Effectful, props: {} }] });

    buildContainerTree(WithEffect);

    expect(effect).not.toHaveBeenCalled();
  });
});

describe('an entity owner', () => {
  const entity = { id: 'entity-1' } as unknown as Entity;
  const owner = entityOwner(entity);

  it('keeps its fibers between builds and mounts state from a seed', () => {
    buildContainerTree(Screen, owner);

    const stateful = getFibersForOwner(owner).find(fiber => fiber.hookStates.some(slot => slot.tag === 'state'));

    expect(stateful).toBeDefined();

    // A fresh session, the way an open after a world reload is: the entity's
    // persisted values are handed over before the first build.
    cleanupComponentTree(owner);
    setStateSeed(owner, new Map([[stateful?.id ?? '', new Map([[0, 'seeded']])]]));

    expect(firstText(buildContainerTree(Screen, owner))).toBe('seeded');

    // The seed is consumed: a fiber created again later starts from its initial value.
    cleanupComponentTree(owner);

    expect(firstText(buildContainerTree(Screen, owner))).toBe('start');

    cleanupComponentTree(owner);
  });

  it('rejects usePlayer at runtime with the same message as the build', () => {
    const PerPlayer = (): JSX.Element => {
      usePlayer();

      return Text({ children: 'never' });
    };
    const WithPlayer = (): JSX.Element => Container({ entity: 'core:test', children: [{ type: PerPlayer, props: {} }] });

    expect(() => buildContainerTree(WithPlayer, owner)).toThrow(/no player to read/);

    cleanupComponentTree(owner);
  });
});

describe('a player owner', () => {
  it('still hands usePlayer its player', () => {
    const player = { id: 'player-1' } as unknown as Player;
    let seen: Player | undefined;
    const Reader = (): JSX.Element => {
      seen = usePlayer();

      return Text({ children: 'x' });
    };

    buildTree(Panel({ children: [{ type: Reader, props: {} }] }), playerOwner(player));

    expect(seen).toBe(player);

    cleanupComponentTree(playerOwner(player));
  });
});

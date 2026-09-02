import type { Player } from '@minecraft/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Panel } from '../../../components/Panel';
import { Text } from '../../../components/Text';
import { useState } from '../../../hooks';
import type { JSX } from '../../../jsx';
import { getFibersForOwner, playerOwner } from '../../fabric';
import { buildTree, cleanupComponentTree } from '../tree';

// State identity across renders: a fiber is its path + name + key, a changed
// key is a new instance, and a fiber the pass never reached is deleted with
// its cleanups run — React's reset semantics, not resurrection at close.

const player = { id: 'player-identity' } as unknown as Player;
const owner = playerOwner(player);

const Stateful = (): JSX.Element => {
  const [label] = useState('fresh');

  return Text({ children: label });
};

/** The screen with `Stateful` mounted under `key`, or without it entirely. */
const screen = (key?: string | number, mounted = true): JSX.Element =>
  Panel({ children: mounted ? [{ type: Stateful, props: key === undefined ? {} : { key } }] : [] });

/** The one stateful fiber, which the tests mutate to watch identity. */
const statefulFiber = () =>
  getFibersForOwner(owner).find(fiber => fiber.hookStates.some(slot => slot.tag === 'state'));

afterEach(() => {
  cleanupComponentTree(owner);
});

describe('component identity', () => {
  it('keeps state while the key stays put', () => {
    buildTree(screen('a'), owner);

    const fiber = statefulFiber();

    expect(fiber).toBeDefined();
    fiber!.hookStates[0].value = 'kept';

    buildTree(screen('a'), owner);

    expect(statefulFiber()!.id).toBe(fiber!.id);
    expect(statefulFiber()!.hookStates[0].value).toBe('kept');
  });

  it('resets state when the key changes, and stays reset on a flip back', () => {
    buildTree(screen('a'), owner);
    statefulFiber()!.hookStates[0].value = 'dirty';

    buildTree(screen('b'), owner);

    // One fiber only: the orphaned 'a' is gone, 'b' starts over.
    expect(getFibersForOwner(owner).filter(f => f.hookStates.length > 0)).toHaveLength(1);
    expect(statefulFiber()!.hookStates[0].value).toBe('fresh');

    statefulFiber()!.hookStates[0].value = 'dirty again';
    buildTree(screen('a'), owner);

    expect(statefulFiber()!.hookStates[0].value).toBe('fresh');
  });

  it('accepts a number key, the way React ids are usually written', () => {
    buildTree(screen(7), owner);

    const fiber = statefulFiber();

    expect(fiber!.id).toContain(':7');
    fiber!.hookStates[0].value = 'kept';

    buildTree(screen(7), owner);

    expect(statefulFiber()!.hookStates[0].value).toBe('kept');
  });

  it('deletes an orphaned fiber and runs its cleanups', () => {
    buildTree(screen(), owner);

    const fiber = statefulFiber();
    const cleanup = vi.fn();

    fiber!.hookStates[0].cleanup = cleanup;

    buildTree(screen(undefined, false), owner);

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(statefulFiber()).toBeUndefined();

    // Mounted again later: a fresh instance, not the old state.
    buildTree(screen(), owner);

    expect(statefulFiber()!.hookStates[0].value).toBe('fresh');
  });
});

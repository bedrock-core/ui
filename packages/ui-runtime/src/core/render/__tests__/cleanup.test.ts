import type { Player } from '@minecraft/server';
import { afterEach, describe, expect, it } from 'vitest';
import { createFiber, getFibersForOwner, playerOwner } from '../../fabric';
import type { Fiber } from '../../fabric/types';
import { cleanupComponentTree } from '../tree';

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cleanup only uses the owner's identity
const owner = playerOwner({ id: 'cleanup-forest' } as Player);
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- cleanup only uses the owner's identity
const other = playerOwner({ id: 'cleanup-other' } as Player);

afterEach(() => { cleanupComponentTree(owner); cleanupComponentTree(other); });

describe('component tree cleanup', () => {
  it('cleans descendants once before their parents with linear identity reads', () => {
    const records: { fiber: Fiber; id: string; parent?: string }[] = [];
    const cleaned: string[] = [];
    let identityReads = 0;
    const root = createFiber(`${owner.id}/Root:0`, owner);

    records.push({ fiber: root, id: root.id });
    let previous: Fiber | undefined;

    for (let branch = 0; branch < 64; branch++) {
      let parent = root;
      const length = 1 + branch * 7 % 16;

      for (let depth = 0; depth < length; depth++) {
        const id = `${parent.id}/${depth === 0 ? `Branch:${branch}` : `Layer:${depth}`}`;
        const fiber = createFiber(id, owner);

        fiber.parent = parent;

        if (depth === 0 && previous !== undefined) { previous.sibling = fiber; } else { parent.child = fiber; }

        if (depth === 0) { previous = fiber; }

        records.push({ fiber, id, parent: parent.id });
        parent = fiber;
      }
    }

    for (const { fiber, id } of records) {
      Object.defineProperty(fiber, 'id', { configurable: true, get: (): string => {
        identityReads++;

        return id;
      } });
      fiber.hookStates.push({ tag: 'effect', value: undefined, cleanup: () => { cleaned.push(id); } });
    }

    const untouched = createFiber(`${other.id}/Other:0`, other);

    cleanupComponentTree(owner);

    expect(cleaned).toHaveLength(records.length);
    expect(new Set(cleaned).size).toBe(records.length);
    expect(identityReads).toBeLessThanOrEqual(records.length * 3);
    const order = new Map(cleaned.map((id, index) => [id, index]));

    for (const { id, parent } of records) {
      if (parent !== undefined) { expect(order.get(id)).toBeLessThan(order.get(parent)!); }
    }

    expect(getFibersForOwner(owner)).toEqual([]);
    expect(getFibersForOwner(other)).toEqual([untouched]);
  });
});

import type { Entity } from '@minecraft/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Container } from '../../../components/Container';
import { Text } from '../../../components/Text';
import { entityOwner, getFibersForOwner } from '../../../core/fabric';
import type { Fiber } from '../../../core/fabric/types';
import { isElement } from '../../../core/guards';
import { clearSession } from '../../../core/render/session';
import { cleanupComponentTree } from '../../../core/render/tree';
import { ContainerScreenError } from '../../../core/types';
import { useReducer, useState } from '../../../hooks';
import type { JSX } from '../../../jsx';
import { buildContainerTree } from '../build';
import { STATE_PROPERTY } from '../contract';
import {
  deserializeState, hydrateState, persistState, PROPERTY_LIMIT, serializeState, type StateHost,
} from '../runtime/store';

/** An entity's dynamic properties, with every write counted. */
const createHost = (initial?: string): StateHost & { writes: number; stored(): string | undefined } => {
  const properties = new Map<string, boolean | number | string>();

  if (initial !== undefined) {
    properties.set(STATE_PROPERTY, initial);
  }

  return {
    writes: 0,
    stored: () => {
      const value = properties.get(STATE_PROPERTY);

      return typeof value === 'string' ? value : undefined;
    },
    getDynamicProperty: identifier => properties.get(identifier),
    setDynamicProperty(identifier, value) {
      this.writes += 1;

      if (value === undefined || typeof value === 'object') {
        properties.delete(identifier);
      } else {
        properties.set(identifier, value);
      }
    },
  };
};

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

let bump: (() => void) | undefined;

const Counter = (): JSX.Element => {
  const [count, setCount] = useState(1);
  const [word, dispatch] = useReducer((state: string, action: string) => state + action, 'a');

  bump = (): void => {
    setCount(value => value + 1);
    dispatch('b');
  };

  return Text({ maxLength: 8, children: `n${count}${word}` });
};

const Screen = (): JSX.Element => Container({ entity: 'core:test', children: [{ type: Counter, props: {} }] });

const entity = { id: 'entity-store' } as unknown as Entity;
const owner = entityOwner(entity);

const fiberWith = (path: string, tag: Fiber['hookStates'][number]['tag'], value: unknown): Fiber => ({
  id: `${owner.id}:${path}`,
  hookStates: [{ tag, value }],
  hookIndex: 0,
  dispatcher: {} as Fiber['dispatcher'],
  owner,
  pendingEffects: [],
  shouldRender: true,
  index: 0,
});

afterEach(() => {
  cleanupComponentTree(owner);
  clearSession(owner);
  vi.restoreAllMocks();
});

describe('state persistence', () => {
  it('round-trips state and reducer values through the entity and the seed', () => {
    const host = createHost();

    expect(hydrateState(host, owner)).toBeUndefined();
    expect(firstText(buildContainerTree(Screen, owner))).toBe('n1a');

    bump?.();

    const json = persistState(host, owner, undefined);

    expect(host.stored()).toBe(json);
    expect(json).toContain('[[0,2],[1,"ab"]]');
    expect(Object.keys(JSON.parse(json))[0]).toContain('Counter');

    // A fresh session, the way an open after a world reload is: nothing in
    // memory, everything on the entity.
    cleanupComponentTree(owner);
    clearSession(owner);

    expect(hydrateState(host, owner)).toBe(json);
    expect(firstText(buildContainerTree(Screen, owner))).toBe('n2ab');
  });

  it('skips the write when nothing changed', () => {
    const host = createHost();

    buildContainerTree(Screen, owner);

    const first = persistState(host, owner, undefined);
    const second = persistState(host, owner, first);

    expect(second).toBe(first);
    expect(host.writes).toBe(1);

    bump?.();
    persistState(host, owner, second);

    expect(host.writes).toBe(2);
  });

  it('does not write state back that the entity already holds', () => {
    const host = createHost();

    buildContainerTree(Screen, owner);

    const json = persistState(host, owner, undefined);

    cleanupComponentTree(owner);
    clearSession(owner);

    const stored = hydrateState(host, owner);

    buildContainerTree(Screen, owner);
    persistState(host, owner, stored);

    expect(host.writes).toBe(1);
    expect(host.stored()).toBe(json);
  });

  it('starts fresh from unreadable state, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const host = createHost('{oops');

    expect(hydrateState(host, owner)).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/\[core\.ui\].*unreadable/));
    expect(firstText(buildContainerTree(Screen, owner))).toBe('n1a');
  });

  it('refuses a snapshot that is not a snapshot', () => {
    expect(() => deserializeState('[1]', owner.id)).toThrow(ContainerScreenError);
    expect(() => deserializeState('{"a":1}', owner.id)).toThrow(/list of hook values/);
    expect(() => deserializeState('{"a":[["x",1]]}', owner.id)).toThrow(/slot index/);
  });

  it('puts the owner back in front of every fiber path', () => {
    const seed = deserializeState('{"Screen/Counter:__auto_0":[[0,5]]}', owner.id);

    expect(seed.get(`${owner.id}:Screen/Counter:__auto_0`)?.get(0)).toBe(5);
  });
});

describe('what state may hold', () => {
  it('rejects a function, naming the fiber and the hook', () => {
    const fibers = [fiberWith('Screen/Widget:__auto_0', 'state', (): number => 1)];

    expect(() => serializeState(fibers, owner.id)).toThrow(ContainerScreenError);
    expect(() => serializeState(fibers, owner.id)).toThrow(/Screen\/Widget:__auto_0 \(hook #0\) holds a function/);
    expect(() => serializeState(fibers, owner.id)).toThrow(/in a ref/);
  });

  it('rejects a class instance, a symbol, a bigint, a non-finite number and a cycle', () => {
    const cycle: Record<string, unknown> = {};

    cycle.self = cycle;

    expect(() => serializeState([fiberWith('A', 'state', new Map())], owner.id)).toThrow(/holds a Map/);
    expect(() => serializeState([fiberWith('A', 'reducer', Symbol('s'))], owner.id)).toThrow(/holds a symbol/);
    expect(() => serializeState([fiberWith('A', 'state', 1n)], owner.id)).toThrow(/holds a bigint/);
    expect(() => serializeState([fiberWith('A', 'state', Number.NaN)], owner.id)).toThrow(/holds NaN/);
    expect(() => serializeState([fiberWith('A', 'state', { nested: [Infinity] })], owner.id)).toThrow(/holds Infinity/);
    expect(() => serializeState([fiberWith('A', 'state', cycle)], owner.id)).toThrow(/holds a cycle/);
  });

  it('accepts plain data and leaves refs, effects and undefined out', () => {
    const fibers = [
      fiberWith('A', 'state', { list: [1, 'two', true, null], nested: { deep: 'x' } }),
      fiberWith('B', 'ref', { current: (): number => 1 }),
      fiberWith('C', 'effect', undefined),
      fiberWith('D', 'state', undefined),
    ];

    expect(JSON.parse(serializeState(fibers, owner.id))).toEqual({
      A: [[0, { list: [1, 'two', true, null], nested: { deep: 'x' } }]],
    });
  });

  it('refuses a snapshot longer than a dynamic property holds', () => {
    const host = createHost();
    const fibers = [fiberWith('A', 'state', 'x'.repeat(PROPERTY_LIMIT))];

    expect(serializeState(fibers, owner.id).length).toBeGreaterThan(PROPERTY_LIMIT);

    vi.spyOn(host, 'getDynamicProperty');

    const big = (): JSX.Element => Container({
      entity: 'core:test',
      children: [{
        type: function Big(): JSX.Element {
          useState('x'.repeat(PROPERTY_LIMIT));

          return Text({ children: 'big' });
        },
        props: {},
      }],
    });

    buildContainerTree(big, owner);

    expect(() => persistState(host, owner, undefined)).toThrow(new RegExp(`${PROPERTY_LIMIT}`));
    expect(host.writes).toBe(0);
  });

  it('wraps an entity that refuses the write', () => {
    const host: StateHost = {
      getDynamicProperty: () => undefined,
      setDynamicProperty: () => {
        throw new Error('nope');
      },
    };

    buildContainerTree(Screen, owner);

    expect(() => persistState(host, owner, undefined)).toThrow(ContainerScreenError);
    expect(() => persistState(host, owner, undefined)).toThrow(/could not be written.*nope/);
  });

  it('persists only the owner’s fibers', () => {
    const other = entityOwner({ id: 'entity-other' } as unknown as Entity);

    buildContainerTree(Screen, owner);
    buildContainerTree(Screen, other);

    const mine = serializeState(getFibersForOwner(owner), owner.id);
    const theirs = serializeState(getFibersForOwner(other), other.id);

    expect(Object.keys(JSON.parse(mine))).toHaveLength(1);
    expect(mine).toBe(theirs);

    cleanupComponentTree(other);
  });
});

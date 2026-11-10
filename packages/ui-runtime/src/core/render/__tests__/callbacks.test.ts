import type { Player } from '@minecraft/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../../../components/Button';
import { Panel } from '../../../components/Panel';
import { Screen } from '../../../components/Screen';
import { useEffect, useReducer, useState } from '../../../hooks';
import type { JSX } from '../../../jsx';
import { BUILD_OWNER, playerOwner } from '../../fabric';
import { childElements } from '../../guards';
import { cacheCallback } from '../callbacks';
import { setSessionRoot, clearSession } from '../session';
import { buildTree, cleanupComponentTree } from '../tree';

const owner = playerOwner({ id: 'compiler-callbacks' } as Player);
const el = (type: unknown, props: Record<string, unknown> = {}): JSX.Element => ({ type, props }) as JSX.Element;
const screen = (child: JSX.Element): JSX.Element => Screen({ children: Panel({ width: 200, height: 100, children: child }) });
const nodes = (tree: JSX.Element): JSX.Element[] => [tree, ...childElements(tree.props.children).flatMap(nodes)];
const pure = <T extends object>(component: T, forwarded: readonly string[] = []): T => {
  Object.defineProperty(component, Symbol.for('@bedrock-core/ui/compiler/pure'), { value: true });
  Object.defineProperty(component, Symbol.for('@bedrock-core/ui/compiler/callback-props'), { value: Object.freeze([...forwarded]) });
  return component;
};
beforeEach(() => setSessionRoot(owner, screen(Panel({}))));
afterEach(() => { cleanupComponentTree(owner); cleanupComponentTree(BUILD_OWNER); clearSession(owner); });

describe('compiler callback caches', () => {
  it('reuses a reducer handler and applies the latest reducer when it fires', () => {
    const counts: number[] = [];
    const Child = pure(vi.fn(({ onPress }: { onPress: () => void }) => Button({ width: 10, height: 10, onPress })), ['onPress']);
    const Parent = ({ step }: { step: number }): JSX.Element => {
      const [count, dispatch] = useReducer((state: number, action: number) => state + action * step, 0);
      counts.push(count);
      return el(Child, { onPress: cacheCallback('reducer-handler', [dispatch], () => dispatch(1)) });
    };

    const first = buildTree(screen(el(Parent, { step: 2 })), owner);
    const press = nodes(first).find(node => node.type === 'button')!.props.onPress as () => void;
    press();
    buildTree(screen(el(Parent, { step: 3 })), owner);
    press();
    buildTree(screen(el(Parent, { step: 3 })), owner);

    expect(counts).toEqual([0, 2, 5]);
    expect(Child).toHaveBeenCalledOnce();
  });

  it('skips a pure child for unchanged captures and delivers fresh handlers when captures change', () => {
    let setCount!: (value: number) => void;
    let setOther!: (value: number) => void;
    const Child = pure(vi.fn(({ onPress }: { onPress: () => number }) => Button({ width: 10, height: 10, onPress })), ['onPress']);
    const Parent = (): JSX.Element => {
      const [count, set] = useState(0);
      const [, update] = useState(0);
      setCount = set;
      setOther = update;
      const handler = cacheCallback('child-handler', [count], () => count);
      return el(Child, { onPress: handler });
    };
    const root = screen(el(Parent));
    const first = buildTree(root, owner);
    setOther(1);
    const unchanged = buildTree(root, owner);
    expect(Child).toHaveBeenCalledOnce();
    expect(unchanged).toEqual(first);
    setCount(5);
    const changed = buildTree(root, owner);
    expect(Child).toHaveBeenCalledTimes(2);
    const press = nodes(changed).find(node => node.type === 'button')!.props.onPress as () => number;
    expect(press()).toBe(5);
  });

  it('keeps arbitrary handlers and unverified function uses evaluating', () => {
    const external = () => 1;
    const Forward = pure(vi.fn(({ onPress }: { onPress: () => number }) => Button({ width: 10, height: 10, onPress })), ['onPress']);
    const Inspect = pure(vi.fn(() => Panel({ width: 10, height: 10 })));
    const Parent = (): JSX.Element => {
      const handler = cacheCallback('unverified-child', [], () => 1);
      return Panel({ children: [el(Forward, { onPress: external }), el(Inspect, { onPress: handler })] });
    };
    const root = screen(el(Parent));
    buildTree(root, owner);
    buildTree(root, owner);
    expect(Forward).toHaveBeenCalledTimes(2);
    expect(Inspect).toHaveBeenCalledTimes(2);
  });

  it('compares a complete row workload with fewer child evaluations and equivalent event results', () => {
    const run = (reuse: boolean): { calls: number; results: number[][]; output: unknown[] } => {
      const Row = vi.fn(({ value, onPress }: { value: number; onPress: () => number }) => Button({
        width: 10, height: 10, testId: String(value), onPress,
      }));
      const Component = reuse ? pure(Row, ['onPress']) : Row;
      const Parent = ({ value }: { value: number }): JSX.Element => {
        const onPress = cacheCallback('row-handler', [value], () => value);
        return el(Component, { value, onPress });
      };
      const results: number[][] = [];
      const output: unknown[] = [];
      for (let revision = 0; revision < 6; revision++) {
        const root = screen(Panel({ children: Array.from({ length: 20 }, (_, index) =>
          el(Parent, { key: index, value: index === 0 ? revision : index })) }));
        const tree = buildTree(root, owner);
        output.push(JSON.parse(JSON.stringify(tree, (_key, value: unknown) => typeof value === 'function' ? '[handler]' : value)));
        results.push(nodes(tree).filter(node => node.type === 'button').map(node => (node.props.onPress as () => number)()));
      }
      cleanupComponentTree(owner);
      return { calls: Row.mock.calls.length, results, output };
    };
    const baseline = run(false);
    const cached = run(true);
    expect(cached.results).toEqual(baseline.results);
    expect(cached.output).toEqual(baseline.output);
    expect(baseline.calls).toBe(120);
    expect(cached.calls).toBe(25);
  });

  it('keeps callback identity on unrelated updates and refreshes state/prop captures', () => {
    const handlers: (() => number)[] = [];
    const setters: ((value: number) => void)[] = [];
    const effects = vi.fn();
    const Page = ({ step }: { step: number }): JSX.Element => {
      const [count, setCount] = useState(0);
      setters.push(setCount);
      const handler = cacheCallback('press', [count, step, setCount], () => count + step);
      handlers.push(handler);
      useEffect(effects, [handler]);
      return Button({ width: 10, height: 10 });
    };
    buildTree(screen(el(Page, { step: 1 })), owner);
    buildTree(screen(el(Page, { step: 1 })), owner);
    expect(handlers[1]).toBe(handlers[0]);
    expect(setters[1]).toBe(setters[0]);
    expect(effects).toHaveBeenCalledOnce();
    setters[0](2);
    buildTree(screen(el(Page, { step: 1 })), owner);
    expect(handlers[2]).not.toBe(handlers[1]);
    expect(handlers[2]()).toBe(3);
    buildTree(screen(el(Page, { step: 5 })), owner);
    expect(handlers[3]()).toBe(7);
    expect(effects).toHaveBeenCalledTimes(3);
  });

  it('retains live object references without freezing event-time fields', () => {
    const record = { value: 1 };
    const handlers: (() => number)[] = [];
    const Page = (): JSX.Element => {
      handlers.push(cacheCallback('object', [record], () => record.value));
      return Panel({});
    };
    buildTree(screen(el(Page)), owner);
    record.value = 2;
    buildTree(screen(el(Page)), owner);
    expect(handlers[1]).toBe(handlers[0]);
    expect(handlers[0]()).toBe(2);
  });

  it.each(['build', 'debug'])('evaluates callbacks normally in %s mode', (mode) => {
    const handlers: (() => number)[] = [];
    const Page = (): JSX.Element => {
      handlers.push(cacheCallback('disabled', [], () => 1));
      return Panel({});
    };
    const root = screen(el(Page));
    if (mode === 'debug') setSessionRoot(owner, root, { debug: true });
    const target = mode === 'build' ? BUILD_OWNER : owner;
    buildTree(root, target);
    buildTree(root, target);
    expect(handlers[1]).not.toBe(handlers[0]);
  });

  it('releases inactive sites and callbacks on unmount', () => {
    const handlers: (() => number)[] = [];
    const Page = ({ active }: { active: boolean }): JSX.Element => {
      if (active) handlers.push(cacheCallback('conditional', [], () => 1));
      return Panel({});
    };
    buildTree(screen(el(Page, { active: true })), owner);
    buildTree(screen(el(Page, { active: false })), owner);
    buildTree(screen(el(Page, { active: true })), owner);
    expect(handlers[1]).not.toBe(handlers[0]);
    cleanupComponentTree(owner);
    buildTree(screen(el(Page, { active: true })), owner);
    expect(handlers[2]).not.toBe(handlers[1]);
  });

  it('keeps repeated sites independent when a helper is called more than once in a render', () => {
    const handlers: (() => number)[] = [];
    const Page = (): JSX.Element => {
      handlers.push(cacheCallback('repeated', [], () => 1), cacheCallback('repeated', [], () => 1));
      return Panel({});
    };
    buildTree(screen(el(Page)), owner);
    buildTree(screen(el(Page)), owner);
    expect(new Set(handlers).size).toBe(4);
  });

  it('does not retain callbacks from a failed render', () => {
    const handlers: (() => number)[] = [];
    let fail = true;
    const Page = (): JSX.Element => {
      handlers.push(cacheCallback('failed', [], () => 1));
      if (fail) throw new Error('failed render');
      return Panel({});
    };
    expect(() => buildTree(screen(el(Page)), owner)).toThrow('failed render');
    fail = false;
    buildTree(screen(el(Page)), owner);
    expect(handlers[1]).not.toBe(handlers[0]);
  });

  it('isolates sites between players and keyed component instances', () => {
    const other = playerOwner({ id: 'compiler-callbacks-other' } as Player);
    const handlers: (() => number)[] = [];
    const Page = (): JSX.Element => {
      handlers.push(cacheCallback('shared-site', [], () => 1));
      return Panel({});
    };
    try {
      buildTree(screen(el(Page, { key: 'a' })), owner);
      buildTree(screen(el(Page, { key: 'a' })), other);
      buildTree(screen(el(Page, { key: 'b' })), owner);
      expect(new Set(handlers).size).toBe(3);
    } finally {
      cleanupComponentTree(other);
      clearSession(other);
    }
  });
});

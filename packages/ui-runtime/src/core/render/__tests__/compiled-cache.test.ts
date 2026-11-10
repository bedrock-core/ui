import type { Entity, Player } from '@minecraft/server';
import { signal } from '@bedrock-core/observable';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../../../components/Button';
import { Container } from '../../../components/Container';
import { Panel } from '../../../components/Panel';
import { Screen } from '../../../components/Screen';
import { Text } from '../../../components/Text';
import { useContext, useEffect, useEvent, useReducer, useState } from '../../../hooks';
import type { FunctionComponent, JSX } from '../../../jsx';
import { BUILD_OWNER, createContext, entityOwner, getFibersForOwner, playerOwner } from '../../fabric';
import { childElements } from '../../guards';
import { takeWidthSlot } from '../buildPass';
import { clearSession, setSessionRoot } from '../session';
import { buildTree, cleanupComponentTree } from '../tree';

const owner = playerOwner({ id: 'compiled-cache-tests' } as Player);
// Fixtures exercise runtime invalidation independently of the source analyzer.
const compiled = <P>(component: FunctionComponent<P>): FunctionComponent<P> =>
  Object.defineProperty(component, Symbol.for('@bedrock-core/ui/compiler/pure'), { value: true });
const el = (type: unknown, props: Record<string, unknown> = {}): JSX.Element => ({ type, props }) as JSX.Element;
const screen = (children: JSX.Node): JSX.Element => Screen({ children: Panel({ width: 200, height: 200, children }) });
const nodes = (tree: JSX.Element): JSX.Element[] => [tree, ...childElements(tree.props.children).flatMap(nodes)];
const values = (tree: JSX.Element): unknown[] => nodes(tree).filter(node => node.type === 'text').map(node => node.props.value);

beforeEach(() => setSessionRoot(owner, screen([])));

afterEach(() => {
  cleanupComponentTree(owner);
  cleanupComponentTree(BUILD_OWNER);
  clearSession(owner);
  vi.restoreAllMocks();
});

describe('compiler-directed component output reuse', () => {
  it('skips equal props, evaluates changed rows and leaves ordinary components evaluating', () => {
    const row = vi.fn(({ label }: { label: string }) => Text({ children: label }));
    const CachedRow = compiled(row);
    const plain = vi.fn(() => Panel({ width: 10, height: 10 }));
    const root = (label: string): JSX.Element => screen([el(CachedRow, { key: 'a', label }), el(CachedRow, { key: 'b', label: 'B' }), el(plain)]);

    buildTree(root('A'), owner);
    buildTree(root('A'), owner);
    const result = buildTree(root('Changed'), owner);

    expect(row.mock.calls.map(([props]) => props.label)).toEqual(['A', 'B', 'Changed']);
    expect(plain).toHaveBeenCalledTimes(3);
    expect(values(result)).toEqual(values(buildTree(screen([Text({ children: 'Changed' }), Text({ children: 'B' })]), owner)));
  });

  it('snapshots outer props and compares added, removed and Object.is values', () => {
    const body = vi.fn(({ value }: { value?: number }) => Text({ children: String(value) }));
    const CachedValue = compiled(body);
    const props: Record<string, unknown> = { value: Number.NaN };
    const root = (): JSX.Element => screen(el(CachedValue, props));

    buildTree(root(), owner);
    buildTree(root(), owner);
    props.value = 0;
    buildTree(root(), owner);
    props.value = -0;
    buildTree(root(), owner);
    delete props.value;
    buildTree(root(), owner);
    props.value = undefined;
    buildTree(root(), owner);

    expect(body).toHaveBeenCalledTimes(5);
  });

  it('updates callback references without retaining an old closure', () => {
    const body = vi.fn(({ onPress }: { onPress: () => void }) => Button({ onPress, width: 20, height: 20 }));
    const CachedButton = compiled(body);
    const first = vi.fn();
    const second = vi.fn();

    buildTree(screen(el(CachedButton, { onPress: first })), owner);
    const tree = buildTree(screen(el(CachedButton, { onPress: second })), owner);
    const press = nodes(tree).find(node => node.type === 'button')!.props.onPress as () => void;

    press();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    expect(body).toHaveBeenCalledTimes(2);
  });

  it('evaluates object-valued children normally and expands their latest values', () => {
    const body = vi.fn(({ children }: { children?: JSX.Node }) => Panel({ children }));
    const CachedParent = compiled(body);
    const first = Text({ children: 'first' });
    const second = Text({ children: 'second' });

    buildTree(screen(el(CachedParent, { children: first })), owner);
    buildTree(screen(el(CachedParent, { children: first })), owner);
    const result = buildTree(screen(el(CachedParent, { children: second })), owner);

    expect(body).toHaveBeenCalledTimes(3);
    expect(values(result)).toEqual(values(buildTree(screen(second), owner)));
  });

  it('keeps mutable object props and accessor props live', () => {
    const body = vi.fn(({ record }: { record: { label: string } }) => Text({ children: record.label }));
    const CachedRow = compiled(body);
    const record = { label: 'first' };
    buildTree(screen(el(CachedRow, { record })), owner);
    record.label = 'changed';
    const result = buildTree(screen(el(CachedRow, { record })), owner);
    expect(body).toHaveBeenCalledTimes(2);
    expect(values(result)).toEqual(values(buildTree(screen(Text({ children: 'changed' })), owner)));

    const read = vi.fn(() => record.label);
    const props = Object.defineProperty({}, 'label', { get: read, enumerable: true });
    const accessor = vi.fn(({ label }: { label: string }) => Text({ children: label }));
    const Accessor = compiled(accessor);
    buildTree(screen(el(Accessor, props)), owner);
    buildTree(screen(el(Accessor, props)), owner);
    expect(accessor).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('keeps callable props live when their properties change without a new reference', () => {
    const callback = Object.assign(() => {}, { label: 'first' });
    const body = vi.fn(({ callback }: { callback: (() => void) & { label: string } }) => Text({ children: callback.label }));
    const Row = compiled(body);
    buildTree(screen(el(Row, { callback })), owner);
    callback.label = 'changed';
    const result = buildTree(screen(el(Row, { callback })), owner);
    expect(body).toHaveBeenCalledTimes(2);
    expect(values(result)).toEqual(values(buildTree(screen(Text({ children: 'changed' })), owner)));
  });

  it('keeps inherited scalar props live when the prototype changes', () => {
    const prototype = { label: 'first' };
    const props: Record<string, unknown> = {};

    Object.setPrototypeOf(props, prototype);
    const body = vi.fn(({ label }: { label: string }) => Text({ children: label }));
    const Row = compiled(body);

    buildTree(screen(el(Row, props)), owner);
    prototype.label = 'changed';
    const result = buildTree(screen(el(Row, props)), owner);

    expect(body).toHaveBeenCalledTimes(2);
    expect(values(result)).toEqual(values(buildTree(screen(Text({ children: 'changed' })), owner)));
  });

  it('keeps inherited getters live without reading them during eligibility checks', () => {
    let label = 'first';
    const read = vi.fn(() => label);
    const props: Record<string, unknown> = {};

    Object.setPrototypeOf(props, Object.defineProperty({}, 'label', { get: read }));
    const body = vi.fn(({ label }: { label: string }) => Text({ children: label }));
    const Row = compiled(body);

    buildTree(screen(el(Row, props)), owner);
    label = 'changed';
    const result = buildTree(screen(el(Row, props)), owner);

    expect(body).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledTimes(2);
    expect(values(result)).toEqual(values(buildTree(screen(Text({ children: 'changed' })), owner)));
  });

  it('keeps non-enumerable scalar props live when their value changes', () => {
    const props: Record<string, unknown> = {};

    Object.defineProperty(props, 'label', { value: 'first', writable: true });
    const body = vi.fn(({ label }: { label: string }) => Text({ children: label }));
    const Row = compiled(body);

    buildTree(screen(el(Row, props)), owner);
    props.label = 'changed';
    const result = buildTree(screen(el(Row, props)), owner);

    expect(body).toHaveBeenCalledTimes(2);
    expect(values(result)).toEqual(values(buildTree(screen(Text({ children: 'changed' })), owner)));
  });

  it('keeps non-enumerable accessor props live', () => {
    let label = 'first';
    const read = vi.fn(() => label);
    const props: Record<string, unknown> = {};

    Object.defineProperty(props, 'label', { get: read });
    const body = vi.fn(({ label }: { label: string }) => Text({ children: label }));
    const Row = compiled(body);

    buildTree(screen(el(Row, props)), owner);
    label = 'changed';
    const result = buildTree(screen(el(Row, props)), owner);

    expect(body).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledTimes(2);
    expect(values(result)).toEqual(values(buildTree(screen(Text({ children: 'changed' })), owner)));
  });

  it('reuses enumerable scalar props with a null prototype', () => {
    const props: Record<string, unknown> = { label: 'first' };

    Object.setPrototypeOf(props, null);
    const body = vi.fn(({ label }: { label: string }) => Text({ children: label }));
    const Row = compiled(body);

    buildTree(screen(el(Row, props)), owner);
    buildTree(screen(el(Row, props)), owner);

    expect(body).toHaveBeenCalledOnce();
  });

  it('remeasures reused output against changing parent geometry and inherited state', () => {
    const Row = (): JSX.Element => Text({ width: '100%', wordBreak: 'break-word', children: 'Text wraps across several lines.' });
    const body = vi.fn(Row);
    const CachedRow = compiled(body);
    const root = (component: unknown, width: number, visible: boolean): JSX.Element => Screen({
      children: Panel({ width, height: 100, visible, enabled: visible, children: el(component) }),
    });
    const actual = [buildTree(root(CachedRow, 40, false), owner), buildTree(root(CachedRow, 160, true), owner)];
    cleanupComponentTree(owner);
    const expected = [buildTree(root(Row, 40, false), owner), buildTree(root(Row, 160, true), owner)];

    expect(body).toHaveBeenCalledOnce();
    expect(actual).toEqual(expected);
  });

  it('isolates cached output between entity owners and releases it on close', () => {
    const first = entityOwner({ id: 'compiled-cache-entity-a' } as Entity);
    const second = entityOwner({ id: 'compiled-cache-entity-b' } as Entity);
    const body = vi.fn(() => Text({ width: 100, children: 'Shared screen' }));
    const root = Container({ entity: 'compiled-cache:host', children: Panel({ width: 200, height: 40, children: el(compiled(body)) }) });

    try {
      buildTree(root, first);
      buildTree(root, first);
      buildTree(root, second);
      buildTree(root, second);
      expect(body).toHaveBeenCalledTimes(2);
      cleanupComponentTree(first);
      buildTree(root, first);
      expect(body).toHaveBeenCalledTimes(3);
    } finally {
      cleanupComponentTree(first);
      cleanupComponentTree(second);
      clearSession(first);
      clearSession(second);
    }
  });

  it('invalidates on state changes and skips equal state updates', () => {
    let setValue!: (value: number) => void;
    const body = vi.fn(() => {
      const [value, set] = useState(0);
      setValue = set;
      return Text({ children: String(value) });
    });
    const root = screen(el(compiled(body)));

    buildTree(root, owner);
    setValue(0);
    buildTree(root, owner);
    setValue(2);
    const result = buildTree(root, owner);

    expect(body).toHaveBeenCalledTimes(2);
    expect(values(result)).toEqual(values(buildTree(screen(Text({ children: '2' })), owner)));
  });

  it('invalidates reducer dispatches', () => {
    let dispatch!: (value: number) => void;
    const body = vi.fn(() => {
      const [value, send] = useReducer((state: number, action: number) => state + action, 0);
      dispatch = send;
      return Text({ children: String(value) });
    });
    const root = screen(el(compiled(body)));

    buildTree(root, owner);
    dispatch(3);
    buildTree(root, owner);
    buildTree(root, owner);

    expect(body).toHaveBeenCalledTimes(2);
    expect(getFibersForOwner(owner).find(fiber => fiber.hookStates.some(slot => slot.tag === 'reducer'))!.hookStates[0].value).toBe(3);
  });

  it.each(['render', 'effect'])('does not cache stale output when state changes during %s', (phase) => {
    const body = vi.fn(() => {
      const [value, set] = useState(0);
      useEffect(() => { if (phase === 'effect') set(1); }, []);
      if (phase === 'render' && value === 0) set(1);
      return Text({ children: String(value) });
    });
    const root = screen(el(compiled(body)));

    buildTree(root, owner);
    const result = buildTree(root, owner);
    buildTree(root, owner);

    expect(body).toHaveBeenCalledTimes(2);
    expect(values(result)).toEqual(values(buildTree(screen(Text({ children: '1' })), owner)));
  });

  it('invalidates consumed context while ignoring unrelated provider values', () => {
    const Used = createContext('default');
    const Other = createContext(0);
    const body = vi.fn(() => Text({ children: useContext(Used) }));
    const CachedReader = compiled(body);
    const root = (value: string, other: number): JSX.Element => screen(el(Used, { value,
      children: el(Other, { value: other, children: el(CachedReader) }) }));

    buildTree(root('one', 1), owner);
    buildTree(root('one', 2), owner);
    const result = buildTree(root('two', 2), owner);

    expect(body).toHaveBeenCalledTimes(2);
    expect(values(result)).toEqual(values(buildTree(screen(Text({ children: 'two' })), owner)));
  });

  it('continues expanding descendants for their state and context updates', () => {
    const Value = createContext('one');
    let setValue!: (value: number) => void;
    const child = vi.fn(() => {
      const [value, set] = useState(0);
      setValue = set;
      return Text({ children: `${useContext(Value)}:${String(value)}` });
    });
    const CachedChild = compiled(child);
    const parent = vi.fn(() => el(CachedChild));
    const CachedParent = compiled(parent);
    const root = (value: string): JSX.Element => screen(el(Value, { value, children: el(CachedParent) }));

    buildTree(root('one'), owner);
    setValue(1);
    buildTree(root('one'), owner);
    const result = buildTree(root('two'), owner);

    expect(parent).toHaveBeenCalledOnce();
    expect(child).toHaveBeenCalledTimes(3);
    expect(values(result)).toEqual(values(buildTree(screen(Text({ children: 'two:1' })), owner)));
  });

  it('preserves keyed state and sibling links across reorders, and releases removed output', () => {
    const cleanup = vi.fn();
    const body = vi.fn(({ label }: { label: string }) => {
      const [value] = useState(label);
      useEffect(() => cleanup, []);
      return Text({ children: value });
    });
    const CachedRow = compiled(body);
    const Parent = ({ order }: { order: string[] }): JSX.Element => Panel({ children: order.map(label => el(CachedRow, { key: label, label })) });
    const root = (order: string[]): JSX.Element => screen(el(Parent, { order }));

    buildTree(root(['a', 'b']), owner);
    const cachedA = getFibersForOwner(owner).find(fiber => fiber.id.endsWith(':a'))!;
    buildTree(root(['b', 'a']), owner);
    const parent = getFibersForOwner(owner).find(fiber => fiber.child?.id.endsWith(':b'))!;

    expect(parent.child?.index).toBe(0);
    expect(parent.child?.sibling).toBe(cachedA);
    expect(cachedA.index).toBe(1);
    expect(body).toHaveBeenCalledTimes(2);
    buildTree(root(['b']), owner);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(cachedA.memoCache).toBeUndefined();
    buildTree(root(['b', 'a']), owner);
    expect(body).toHaveBeenCalledTimes(3);
  });

  it('skips effects on hits and cleans up on changed props and unmount', () => {
    const effect = vi.fn();
    const cleanup = vi.fn();
    const CachedEffect = compiled(({ value }: { value: number }) => {
      useEffect(() => { effect(value); return () => cleanup(value); });
      return Panel({ width: 10, height: 10 });
    });

    buildTree(screen(el(CachedEffect, { value: 1 })), owner);
    buildTree(screen(el(CachedEffect, { value: 1 })), owner);
    buildTree(screen(el(CachedEffect, { value: 2 })), owner);
    buildTree(screen([]), owner);

    expect(effect.mock.calls).toEqual([[1], [2]]);
    expect(cleanup.mock.calls).toEqual([[1], [2]]);
  });

  it('handles event-driven state updates and unsubscribes cached components', () => {
    const events = signal<number>();
    const seen = vi.fn();
    const body = vi.fn(() => {
      const [value, set] = useState(0);
      useEvent(events, (next) => { seen(next); set(next); });
      return Text({ children: String(value) });
    });
    const root = screen(el(compiled(body)));

    buildTree(root, owner);
    buildTree(root, owner);
    events.emit(2);
    buildTree(root, owner);
    buildTree(screen([]), owner);
    events.emit(3);

    expect(body).toHaveBeenCalledTimes(2);
    expect(seen.mock.calls).toEqual([[2]]);
  });

  it.each(['build', 'debug'])('always evaluates in %s mode', (mode) => {
    const body = vi.fn(() => Panel({ width: 10, height: 10 }));
    const root = screen(el(compiled(body)));
    const target = mode === 'build' ? BUILD_OWNER : owner;

    if (mode === 'debug') setSessionRoot(owner, root, { debug: true });
    buildTree(root, target);
    buildTree(root, target);

    expect(body).toHaveBeenCalledTimes(2);
  });

  it('keeps render-order composition slot consumers evaluating', () => {
    const slots: number[] = [];
    const body = vi.fn(() => {
      slots.push(takeWidthSlot()!.slot);
      return Text({ children: 'first' });
    });
    const CachedFirst = compiled(body);
    const Later = (): JSX.Element => {
      slots.push(takeWidthSlot()!.slot);
      return Text({ children: 'later' });
    };
    const root = screen([el(CachedFirst), el(Later)]);

    buildTree(root, owner);
    buildTree(root, owner);

    expect(slots).toEqual([0, 1, 0, 1]);
    expect(body).toHaveBeenCalledTimes(2);
  });

  it('does not reuse output from an evaluation that threw', () => {
    let fail = true;
    const body = vi.fn(() => {
      if (fail) throw new Error('render failed');
      return Panel({ width: 10, height: 10 });
    });
    const root = screen(el(compiled(body)));

    expect(() => buildTree(root, owner)).toThrow('render failed');
    fail = false;
    buildTree(root, owner);
    buildTree(root, owner);
    expect(body).toHaveBeenCalledTimes(2);
  });

  it('reduces row evaluations while preserving the complete output for the same workload', () => {
    const workload = (reuse: boolean): { trees: JSX.Element[]; calls: number } => {
      let calls = 0;
      const Row = ({ value }: { value: number }): JSX.Element => {
        calls++;
        return Text({ width: 100, height: 10, children: String(value) });
      };
      const Component = reuse ? compiled(Row) : Row;
      const trees: JSX.Element[] = [];
      for (let update = 0; update <= 10; update++) {
        trees.push(buildTree(screen(Array.from({ length: 40 }, (_, index) => el(Component,
          { key: index, value: index === 0 ? update : index }))), owner));
      }
      cleanupComponentTree(owner);
      return { trees, calls };
    };
    const plain = workload(false);
    const reused = workload(true);

    expect(reused.trees).toEqual(plain.trees);
    expect(plain.calls).toBe(440);
    expect(reused.calls).toBe(50);
  });
});

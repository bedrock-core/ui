import type { Player } from '@minecraft/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Panel } from '../../../components/Panel';
import { Screen } from '../../../components/Screen';
import { Text } from '../../../components/Text';
import { useState } from '../../../hooks';
import type { JSX } from '../../../jsx';
import { BUILD_OWNER, playerOwner } from '../../fabric';
import { cacheCallback, cacheValue } from '../callbacks';
import { clearSession, setSessionRoot } from '../session';
import { buildTree, cleanupComponentTree } from '../tree';

const owner = playerOwner({ id: 'compiler-values' } as Player);
const el = (type: unknown, props: Record<string, unknown> = {}): JSX.Element => ({ type, props }) as JSX.Element;
const screen = (child: JSX.Element): JSX.Element => Screen({ children: Panel({ width: 200, height: 100, children: child }) });
beforeEach(() => setSessionRoot(owner, screen(Panel({}))));
afterEach(() => { cleanupComponentTree(owner); cleanupComponentTree(BUILD_OWNER); clearSession(owner); });

describe('compiler derived value caches', () => {
  it('produces the complete uncached output with fewer formatting evaluations', () => {
    const run = (cached: boolean): { calls: number; output: JSX.Element[] } => {
      const compute = vi.fn((label: string, count: number) => `${label}: ${count}`);
      const Page = ({ label, count }: { label: string; count: number }): JSX.Element => {
        useState(0);
        const format = (): string => compute(label, count);
        const text = cached ? cacheValue('comparison', [label, count], format) : format();
        return Text({ children: text });
      };
      const output = [['Rows', 1], ['Rows', 1], ['Rows', 2], ['Items', 2], ['Items', 2]].map(([label, count]) =>
        buildTree(screen(el(Page, { label, count })), owner));
      cleanupComponentTree(owner);
      return { calls: compute.mock.calls.length, output };
    };
    const ordinary = run(false);
    const cached = run(true);
    expect(cached.output).toEqual(ordinary.output);
    expect(ordinary.calls).toBe(5);
    expect(cached.calls).toBe(3);
  });

  it('reuses formatting across unrelated state updates and recomputes changed inputs', () => {
    let setCount!: (value: number) => void;
    let setOther!: (value: number) => void;
    const compute = vi.fn((prefix: string, count: number) => `${prefix}: ${count}`);
    const Page = ({ prefix }: { prefix: string }): JSX.Element => {
      const [count, set] = useState(1);
      const [, update] = useState(0);
      setCount = set;
      setOther = update;
      const label = cacheValue('label', [prefix, count], () => compute(prefix, count));
      return Text({ children: label });
    };
    const root = screen(el(Page, { prefix: 'Rows' }));
    const first = buildTree(root, owner);
    setOther(1);
    expect(buildTree(root, owner)).toEqual(first);
    expect(compute).toHaveBeenCalledOnce();
    setCount(2);
    expect(buildTree(root, owner)).not.toEqual(first);
    expect(compute).toHaveBeenLastCalledWith('Rows', 2);
    buildTree(screen(el(Page, { prefix: 'Items' })), owner);
    expect(compute).toHaveBeenLastCalledWith('Items', 2);
    expect(compute).toHaveBeenCalledTimes(3);
  });

  it('keeps mutable object and function coercion live', () => {
    let label = 'first';
    const object = { toString: vi.fn(() => label) };
    const fn = Object.assign(() => {}, { toString: vi.fn(() => label) });
    const results: string[] = [];
    const Page = (): JSX.Element => {
      results.push(cacheValue('object', [object], () => `${object}`), cacheValue('function', [fn], () => `${fn}`));
      return Panel({});
    };
    const root = screen(el(Page));
    buildTree(root, owner);
    label = 'changed';
    buildTree(root, owner);
    expect(results).toEqual(['first', 'first', 'changed', 'changed']);
    expect(object.toString).toHaveBeenCalledTimes(2);
    expect(fn.toString).toHaveBeenCalledTimes(2);
  });

  it('uses Object.is dependency equality and caches undefined results', () => {
    const compute = vi.fn(() => undefined);
    const Page = ({ value }: { value: unknown }): JSX.Element => {
      expect(cacheValue('scalars', [value], compute)).toBeUndefined();
      return Panel({});
    };
    for (const value of [NaN, NaN, 0, -0, -0, null, null, undefined, undefined]) {
      buildTree(screen(el(Page, { value })), owner);
    }
    expect(compute).toHaveBeenCalledTimes(5);
  });

  it.each(['build', 'debug', 'outside'] as const)('evaluates without caching in %s mode', mode => {
    const compute = vi.fn(() => 'value');
    const Page = (): JSX.Element => { cacheValue('disabled', [], compute); return Panel({}); };
    const root = screen(el(Page));
    if (mode === 'debug') setSessionRoot(owner, root, { debug: true });
    if (mode === 'outside') { cacheValue('disabled', [], compute); cacheValue('disabled', [], compute); }
    else { buildTree(root, mode === 'build' ? BUILD_OWNER : owner); buildTree(root, mode === 'build' ? BUILD_OWNER : owner); }
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('releases inactive sites and all values on unmount', () => {
    const compute = vi.fn(() => 'value');
    const Page = ({ active }: { active: boolean }): JSX.Element => {
      if (active) cacheValue('conditional', [], compute);
      return Panel({});
    };
    for (const active of [true, true, false, true]) buildTree(screen(el(Page, { active })), owner);
    expect(compute).toHaveBeenCalledTimes(2);
    cleanupComponentTree(owner);
    buildTree(screen(el(Page, { active: true })), owner);
    expect(compute).toHaveBeenCalledTimes(3);
  });

  it('discards values from failed renders and retries thrown computations', () => {
    let fail = true;
    const compute = vi.fn(() => { if (fail) throw new Error('compute failed'); return 'value'; });
    const Page = (): JSX.Element => { cacheValue('failed', [], compute); return Panel({}); };
    const root = screen(el(Page));
    expect(() => buildTree(root, owner)).toThrow('compute failed');
    fail = false;
    buildTree(root, owner);
    buildTree(root, owner);
    expect(compute).toHaveBeenCalledTimes(2);
    cleanupComponentTree(owner);
    let failAfter = true;
    const LaterFailure = (): JSX.Element => {
      cacheValue('before-failure', [], compute);
      if (failAfter) throw new Error('render failed');
      return Panel({});
    };
    const failedRoot = screen(el(LaterFailure));
    expect(() => buildTree(failedRoot, owner)).toThrow('render failed');
    failAfter = false;
    buildTree(failedRoot, owner);
    expect(compute).toHaveBeenCalledTimes(4);
  });

  it('falls back for repeated sites and keeps callback entries independent', () => {
    const compute = vi.fn(() => 'value');
    const handlers: (() => string)[] = [];
    const Page = (): JSX.Element => {
      cacheValue('repeated', [], compute);
      cacheValue('repeated', [], compute);
      cacheValue('single', [], compute);
      handlers.push(cacheCallback('handler', [], () => 'current'));
      return Panel({});
    };
    const root = screen(el(Page));
    buildTree(root, owner);
    buildTree(root, owner);
    expect(compute).toHaveBeenCalledTimes(5);
    expect(handlers[1]).toBe(handlers[0]);
    expect(handlers[1]!()).toBe('current');
  });

  it('isolates values between players and keyed component instances', () => {
    const other = playerOwner({ id: 'compiler-values-other' } as Player);
    const compute = vi.fn(() => 'value');
    const Page = (): JSX.Element => { cacheValue('same', [], compute); return Panel({}); };
    try {
      buildTree(screen(el(Page, { key: 'a' })), owner);
      buildTree(screen(el(Page, { key: 'a' })), owner);
      buildTree(screen(el(Page, { key: 'a' })), other);
      buildTree(screen(el(Page, { key: 'b' })), owner);
      expect(compute).toHaveBeenCalledTimes(3);
    } finally { cleanupComponentTree(other); clearSession(other); }
  });
});

import { describe, expect, it } from 'vitest';
import { createContext } from '../../fabric';
import { useContext } from '../../../hooks/useContext';
import { useEffect } from '../../../hooks/useEffect';
import { usePlayer } from '../../../hooks/usePlayer';
import { useState } from '../../../hooks/useState';
import type { JSX } from '../../../jsx';
import { CompileTimeHookError, expandStatic } from '../phases/expandStatic';

const el = (type: string, props: JSX.Props = {}): JSX.Element => ({ type, props });

const childrenOf = (element: JSX.Element): JSX.Element[] =>
  (element.props.children ?? []) as JSX.Element[];

describe('expandStatic', () => {
  it('calls function components and keeps their output', () => {
    const Leaf = (): JSX.Element => el('text', { children: [] });
    const Screen = (): JSX.Element => el('panel', { children: [el(Leaf as never, {})] });

    const tree = expandStatic(el(Screen as never, {}));

    expect(tree.type).toBe('panel');
    expect(childrenOf(tree)).toHaveLength(1);
    expect(childrenOf(tree)[0]?.type).toBe('text');
  });

  it('passes props through to components', () => {
    const Badge = ({ label }: { label: string }): JSX.Element => el('text', { label, children: [] });
    const tree = expandStatic(el(Badge as never, { label: 'ready' }));

    expect(tree.props.label).toBe('ready');
  });

  it('resolves context providers, and they vanish from the output', () => {
    const Theme = createContext('light');
    const Reader = (): JSX.Element => el('text', { label: useContext(Theme), children: [] });

    const tree = expandStatic(
      el('context-provider', {
        __context: Theme,
        value: 'dark',
        children: [el(Reader as never, {})],
      }),
    );

    // The provider collapses to a fragment; the value reached the consumer.
    expect(tree.type).toBe('fragment');
    expect(childrenOf(tree)[0]?.props.label).toBe('dark');
  });

  it('falls back to the context default outside any provider', () => {
    const Theme = createContext('light');
    const Reader = (): JSX.Element => el('text', { label: useContext(Theme), children: [] });

    expect(expandStatic(el(Reader as never, {})).props.label).toBe('light');
  });

  it('seeds contexts supplied by the build itself', () => {
    const Theme = createContext('light');
    const Reader = (): JSX.Element => el('text', { label: useContext(Theme), children: [] });

    const tree = expandStatic(el(Reader as never, {}), new Map([[Theme, 'ore']]));

    expect(tree.props.label).toBe('ore');
  });

  describe('rejecting runtime-only hooks', () => {
    it.each([
      ['useState', (): unknown => useState(0)],
      ['useEffect', (): unknown => useEffect(() => undefined, [])],
      ['usePlayer', (): unknown => usePlayer()],
    ])('refuses %s', (name, call) => {
      const Screen = (): JSX.Element => {
        call();

        return el('panel', { children: [] });
      };

      expect(() => expandStatic(el(Screen as never, {}))).toThrow(CompileTimeHookError);
      expect(() => expandStatic(el(Screen as never, {}))).toThrow(
        new RegExp(`${name}\\(\\) cannot be used in a compiled screen`),
      );
    });

    it('says what to reach for instead, not just what is forbidden', () => {
      const Screen = (): JSX.Element => {
        useState(0);

        return el('panel', { children: [] });
      };

      expect(() => expandStatic(el(Screen as never, {})))
        .toThrow(/Instead: keep the state in your script and declare a channel/);
    });
  });

  it('leaves no dispatcher installed once it returns', () => {
    const Screen = (): JSX.Element => el('panel', { children: [] });

    expandStatic(el(Screen as never, {}));

    // A hook called outside a render must still fail the runtime's own way,
    // not silently pick up the compile dispatcher and report a nicer error.
    expect(() => useState(0)).toThrow(/outside an active fiber/);
  });

  it('clears the dispatcher even when a component throws', () => {
    const Screen = (): JSX.Element => {
      usePlayer();

      return el('panel', { children: [] });
    };

    expect(() => expandStatic(el(Screen as never, {}))).toThrow(CompileTimeHookError);
    expect(() => useState(0)).toThrow(/outside an active fiber/);
  });
});

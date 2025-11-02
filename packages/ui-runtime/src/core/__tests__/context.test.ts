import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createContext } from '../../core';
import { buildTree, cleanupComponentTree } from '../../core/render';
import type { Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../../jsx';
import { useContext } from '../../hooks/useContext';

describe('fiber-scoped context', () => {
  let player: Player;
  beforeEach(() => {
    player = { name: 'Steve' } as unknown as Player;
  });

  afterEach(() => {
    cleanupComponentTree(player);
  });

  it('returns default value when no provider is present', async() => {
    const Ctx = createContext<number>(42);
    let observed = 0;

    const Child: FunctionComponent = (): JSX.Element => {
      const v = useContext(Ctx);
      observed = v;

      return { type: 'fragment', props: { children: [] } };
    };

    const root: JSX.Element = { type: Child, props: {} };

    await buildTree(root, player);
    expect(observed).toBe(42);
  });

  it('provider overrides value for subtree only', async() => {
    const Ctx = createContext<string>('default');
    let a = '';
    let b = '';

    const ReadA: FunctionComponent = (): JSX.Element => {
      a = useContext(Ctx);

      return { type: 'fragment', props: { children: [] } };
    };
    const ReadB: FunctionComponent = (): JSX.Element => {
      b = useContext(Ctx);

      return { type: 'fragment', props: { children: [] } };
    };

    const tree: JSX.Element = {
      type: 'fragment',
      props: {
        children: [
          { type: ReadA, props: {} },
          {
            // Cast to relax JSX typing invariance for provider element construction in tests
            type: Ctx as unknown as FunctionComponent,
            props: { value: 'override', children: { type: ReadB, props: {} } } as unknown as JSX.Props,
          },
        ],
      },
    };

    await buildTree(tree, player);
    expect(a).toBe('default');
    expect(b).toBe('override');
  });
});

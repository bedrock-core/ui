import { describe, it, expect, beforeEach } from 'vitest';
import type { JSX as JSXNS } from '../../jsx';
import { buildTree, cleanupComponentTree } from '../render/tree';
import { getFibersForPlayer } from '../fabric';
import { Player } from '@minecraft/server';

// Helper to create an element from a function component
type FC<P = Record<string, unknown>> = (props: P & { children?: JSXNS.Node }) => JSXNS.Element;

function createElement<P>(type: FC<P>, props?: Partial<P> & { children?: JSXNS.Node }): JSXNS.Element {
  return { type, props: (props as P) ?? ({} as P) } as unknown as JSXNS.Element;
}

// Mock player instance with a stable id
function makePlayer(id: string): Player & { id: string } {
  const p = Reflect.construct(Player, []) as Player & { id: string };
  (p as unknown as { id: string }).id = id;

  return p;
}

describe('Fiber relations: parent/child/sibling/index', () => {
  const player = makePlayer('TestPlayer');

  beforeEach(() => {
    cleanupComponentTree(player);
  });

  it('links siblings in render order with correct indexes', () => {
    const ChildA: FC = () => ({ type: 'fragment', props: { children: [] } as unknown as JSXNS.Props } as unknown as JSXNS.Element);
    const ChildB: FC = () => ({ type: 'fragment', props: { children: [] } as unknown as JSXNS.Props } as unknown as JSXNS.Element);

    const Parent: FC = () => ({
      type: 'fragment',
      props: { children: [createElement(ChildA, {}), createElement(ChildB, {})] } as unknown as JSXNS.Props,
    } as unknown as JSXNS.Element);

    const root = createElement(Parent, {});

    const [tree] = buildTree(root, player);
    expect(tree).toBeTruthy();

    const fibers = getFibersForPlayer(player);
    expect(fibers.length).toBeGreaterThanOrEqual(3); // Parent, ChildA, ChildB

    const parentFiber = fibers.find(f => !f.parent && f.id.includes('Parent'));
    expect(parentFiber).toBeTruthy();
    expect(parentFiber!.child).toBeTruthy();
    const first = parentFiber!.child!;
    expect(first.index).toBe(0);
    expect(first.parent).toBe(parentFiber);
    expect(first.sibling).toBeTruthy();
    const second = first.sibling!;
    expect(second.index).toBe(1);
    expect(second.parent).toBe(parentFiber);
    expect(second.sibling).toBeUndefined();
  });

  it('links nested children and sets index 0 for first child', () => {
    const GrandChild: FC = () => ({ type: 'fragment', props: { children: [] } as unknown as JSXNS.Props } as unknown as JSXNS.Element);
    const Child: FC = () => ({
      type: 'fragment',
      props: { children: [createElement(GrandChild, {})] } as unknown as JSXNS.Props,
    } as unknown as JSXNS.Element);
    const Parent: FC = () => ({
      type: 'fragment',
      props: { children: [createElement(Child, {})] } as unknown as JSXNS.Props,
    } as unknown as JSXNS.Element);

    const [tree] = buildTree(createElement(Parent, {}), player);
    expect(tree).toBeTruthy();

    const fibers = getFibersForPlayer(player);
    const parent = fibers.find(f => !f.parent && f.id.includes('Parent'));
    expect(parent).toBeTruthy();
    const child = parent!.child!;
    expect(child).toBeTruthy();
    expect(child.index).toBe(0);
    expect(child.parent).toBe(parent);
    expect(child.child).toBeTruthy();
    const grand = child.child!;
    expect(grand.index).toBe(0);
    expect(grand.parent).toBe(child);
  });
});

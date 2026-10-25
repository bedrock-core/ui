import { describe, expect, it } from 'vitest';
import { Panel } from '@bedrock-core/ui-runtime';
import { createStackNavigator } from '../stack';
import { createTopTabNavigator } from '../tabs';
import { Controller } from '../controller';
import type { AnyStaticNavigator, ClientNavigationOptions, NavigationAction } from '../common';
import { createModel, initialState, leaf, stateIdentity } from '../state';
import { baseBodies, edgeKey, isNativePlan, preparePlan, replayPlan, type BodyTree } from '../plan';

const Page = () => Panel({});
const replace = (name: string): NavigationAction => ({ type: 'REPLACE', payload: { name } });
const push = (name: string): NavigationAction => ({ type: 'PUSH', payload: { name } });
const back: NavigationAction = { type: 'GO_BACK' };

function fixture(actions: Record<string, Readonly<Record<string, NavigationAction>>>, options: ClientNavigationOptions, navigator?: AnyStaticNavigator) {
  const model = createModel(navigator ?? createStackNavigator({ screens: Object.fromEntries(Object.keys(actions).map(name => [name, Page])) }));
  const controller = new Controller(model, { clientNavigation: options });
  const bodies = baseBodies(model);
  const trees: BodyTree[] = bodies.map(body => ({ body, element: Page(), presses: Object.entries(actions[body.name]).map(([name, action]) => ({
    id: `${body.id}/${name}`, body, element: Page(), link: { action, scope: body.model, server: false },
  })) }));
  const plan = preparePlan(controller, trees, bodies);
  const presses = new Map(trees.flatMap(tree => tree.presses.map(press => [press.id, press] as const)));
  let states = replayPlan(controller, plan, presses);
  let index = 0;

  return {
    plan,
    verifyTransitions() {
      for (let index = 1; index < plan.contexts.length; index++) {
        const state = states[index]!;
        const tree = trees.find(tree => tree.body.name === leaf(state).name)!;

        for (const press of tree.presses) {
          const expected = controller.reduction(state, press.link!.action, press.link!.scope);

          if (expected === undefined) { continue; }

          const target = plan.edges[edgeKey(index, press.id)];

          expect(target).toBeDefined();
          expect(stateIdentity(states[target]!)).toBe(stateIdentity(expected));
          expect(plan.entryEdges?.[press.id]).toContain(target);
        }
      }
    },
    enter(names: readonly string[]) { controller.state = initialState(model, { routes: names.map(name => ({ name })) }); states = replayPlan(controller, plan, presses); index = 0; },
    checkpoint() { controller.state = states[index]!; states = replayPlan(controller, plan, presses); index = 0; },
    state: () => states[index]!,
    move(name: string) {
      const state = states[index]!;
      const tree = trees.find(tree => tree.body.name === leaf(state).name)!;
      const press = tree.presses.find(press => press.id === `${tree.body.id}/${name}`)!;
      const expected = controller.reduction(state, press.link!.action, press.link!.scope);
      const next = index === 0
        ? plan.entryEdges?.[press.id]?.find(target => stateIdentity(states[target]!) === stateIdentity(expected!))
        : plan.edges[edgeKey(index, press.id)];

      expect(next, `${leaf(state).name}: ${name} at context ${index}`).toBeDefined();
      if (next === undefined) { throw new Error('Missing native destination.'); }
      expect(stateIdentity(states[next]!)).toBe(stateIdentity(controller.reduction(state, press.link!.action, press.link!.scope)!));
      index = next;
    },
    has(name: string) {
      const tree = trees.find(tree => tree.body.name === leaf(states[index]!).name)!;

      return plan.edges[edgeKey(index, `${tree.body.id}/${name}`)] !== undefined;
    },
  };
}

describe('native history planning', () => {
  it('keeps sibling paging local after a server checkpoint on any page', () => {
    const names = Array.from({ length: 12 }, (_, index) => `Page${index}`);
    const app = fixture(Object.fromEntries(names.map((name, index) => [name, {
      next: replace(names[(index + 1) % names.length]), previous: replace(names[(index + names.length - 1) % names.length]),
    }])), { maxDepth: 0, maxStates: 16 });

    for (let page = 0; page < 7; page++) { app.move('next'); }
    app.checkpoint();
    for (let page = 0; page < 48; page++) { app.move('next'); app.move('previous'); app.move('next'); }
  });

  it('counts retained nested stacks and tab history in the shared depth budget', () => {
    const navigator = createTopTabNavigator({ backBehavior: 'history', screens: {
      Shop: createStackNavigator({ screens: { A: Page, B: Page } }),
      Settings: createStackNavigator({ screens: { X: Page, Y: Page } }),
    } });
    const app = fixture({
      A: { open: push('B') }, B: { settings: { type: 'JUMP_TO', payload: { name: 'Settings' } }, back },
      X: { open: push('Y'), back }, Y: { back },
    }, { maxDepth: 2, maxStates: 32 }, navigator);

    app.move('open'); app.move('settings');
    expect(leaf(app.state()).name).toBe('X');
    expect(app.has('open')).toBe(false);
    app.move('back');
    expect(leaf(app.state()).name).toBe('B');
    app.move('back');
    expect(leaf(app.state()).name).toBe('A');
  });

  it('cycles through all siblings at zero history depth without allocating more contexts', () => {
    const names = Array.from({ length: 12 }, (_, index) => `Page${index}`);
    const app = fixture(Object.fromEntries(names.map((name, index) => [name, {
      next: replace(names[(index + 1) % names.length]), previous: replace(names[(index + names.length - 1) % names.length]),
    }])), { maxDepth: 0, maxStates: 16 });

    for (let cycle = 0; cycle < 5; cycle++) {
      for (let page = 0; page < names.length; page++) { app.move('next'); expect(app.state().routes).toHaveLength(1); }
      for (let page = 0; page < names.length; page++) { app.move('previous'); expect(app.state().routes).toHaveLength(1); }
    }

    expect(app.plan.contexts.length).toBeLessThanOrEqual(16);
  });

  it('preserves a link parent while replacing many sibling pages and going Back', () => {
    const app = fixture({
      Home: { open: push('A') },
      A: { next: replace('B'), back },
      B: { next: replace('C'), back },
      C: { next: replace('A'), back },
    }, { maxDepth: 1, maxStates: 24 });

    for (let cycle = 0; cycle < 5; cycle++) {
      app.move('open');
      for (let page = 0; page < 12; page++) { app.move('next'); expect(app.state().routes).toHaveLength(2); }
      app.move('back');
      expect(app.state().routes.map(route => route.name)).toEqual(['Home']);
    }
  });

  it('keeps the confirmed linked parent while paging after a server checkpoint', () => {
    const app = fixture({ Home: { open: push('A') }, A: { next: replace('B') }, B: { next: replace('C') }, C: { next: replace('A') } }, {
      maxDepth: 1, maxStates: 16,
    });

    app.move('open'); app.move('next'); app.checkpoint();
    for (let step = 0; step < 30; step++) {
      app.move('next');
      expect(app.state().routes).toHaveLength(2);
      expect(app.state().routes[0].name).toBe('Home');
    }
  });

  it('keeps true nested links bounded and can return through their prepared history', () => {
    const app = fixture({ A: { open: push('B') }, B: { open: push('C'), back }, C: { open: push('D'), back }, D: { back } }, {
      maxDepth: 2, maxStates: 32,
    });

    app.move('open'); app.move('open');
    expect(app.has('open')).toBe(false);
    app.move('back'); app.move('back');
    expect(app.state().routes.map(route => route.name)).toEqual(['A']);
  });

  it('prioritizes sibling coverage before nested link combinations use a small state budget', () => {
    const names = Array.from({ length: 8 }, (_, index) => `Page${index}`);
    const app = fixture(Object.fromEntries(names.map((name, index) => [name, {
      deeper: push(names[(index + 2) % names.length]), next: replace(names[(index + 1) % names.length]),
    }])), { maxDepth: 2, maxStates: names.length + 1 });

    for (let page = 0; page < 32; page++) { app.move('next'); }
    expect(app.plan.contexts).toHaveLength(names.length + 1);
    expect(app.has('deeper')).toBe(false);
  });
});


describe('recent native history', () => {
  it('prepares finite server entry histories that cannot be reached by a local link', () => {
    const app = fixture({ Home: {}, Player: { open: push('Preferences'), back }, Preferences: { back } }, {
      history: 'recent', maxDepth: 5, maxStates: 16,
      entryStates: [{ routes: [{ name: 'Home' }, { name: 'Player' }] }],
    });

    app.enter(['Home', 'Player']);
    app.move('open');
    expect(app.state().routes.map(route => route.name)).toEqual(['Home', 'Player', 'Preferences']);
    app.checkpoint(); app.move('back'); app.move('back');
    expect(leaf(app.state()).name).toBe('Home');
    app.verifyTransitions();
  });

  it('rejects an unknown entry route instead of treating it as a budget fallback', () => {
    expect(() => fixture({ Home: {} }, {
      history: 'recent', fallback: 'server', entryStates: [{ routes: [{ name: 'Unknown' }] }],
    })).toThrow('Unknown');
  });

  it('collapses a visited-page loop and retains Back across a server checkpoint', () => {
    const app = fixture({ A: { open: push('B') }, B: { open: push('C'), back }, C: { loop: push('B'), back } }, {
      history: 'recent', maxDepth: 5, maxStates: 64,
    });

    for (let cycle = 0; cycle < 10; cycle++) {
      app.move('open'); app.move('open'); app.move('loop');
      expect(app.state().routes.map(route => route.name)).toEqual(['A', 'B']);
      app.checkpoint(); app.move('back');
      expect(leaf(app.state()).name).toBe('A');
    }

    app.verifyTransitions();
  });

  it('collapses pagination that reaches a retained parent', () => {
    const app = fixture({ A: { open: push('B') }, B: { open: push('C'), back }, C: { loop: replace('A'), back } }, {
      history: 'recent', maxDepth: 5, maxStates: 64,
    });

    app.move('open'); app.move('open'); app.move('loop');
    expect(app.state().routes.map(route => route.name)).toEqual(['A']);
    app.verifyTransitions();
  });

  it('drops the oldest history at five added levels while all reading transitions stay local', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    const app = fixture(Object.fromEntries(names.map((name, index) => [name, { next: push(names[(index + 1) % names.length]), back }])), {
      history: 'recent', maxDepth: 5, maxStates: 128,
    });

    for (let step = 0; step < 70; step++) {
      app.move('next');
      expect(app.state().routes.length).toBeLessThanOrEqual(6);
      expect(new Set(app.state().routes.map(route => route.name)).size).toBe(app.state().routes.length);
      if (step % 7 === 0) { app.checkpoint(); }
    }

    for (let step = 0; step < 5; step++) { app.move('back'); }
    expect(app.state().routes).toHaveLength(1);
    app.verifyTransitions();
  });

  it.each([undefined, 'server'] as const)('keeps recent histories in the shared format when the budget fills with fallback %s', (fallback) => {
    const app = fixture({ A: { open: push('B') }, B: { open: push('C'), back }, C: { open: push('D'), back }, D: { open: push('E'), back }, E: { back } }, {
      history: 'recent', maxDepth: 5, maxStates: 4, fallback,
    });

    expect(app.plan.v).toBe(3);
    expect(app.plan.contexts.length).toBeLessThanOrEqual(4);
    app.move('open'); app.move('open');
    expect(app.has('open')).toBe(false);
    app.move('back');
    expect(leaf(app.state()).name).toBe('B');
  });

  it('rejects an invalid recent history budget even when server fallback is allowed', () => {
    expect(() => fixture({ A: { open: push('B') }, B: { back } }, {
      history: 'recent', maxStates: 0, fallback: 'server',
    })).toThrow('Client navigation requires a positive maxStates integer');
  });

  it('fails compilation rather than omitting transitions when complete recent history cannot fit', () => {
    expect(() => fixture({ A: { open: push('B') }, B: { open: push('C') }, C: { open: push('A') } }, {
      history: 'recent', maxDepth: 5, maxStates: 4, fallback: 'error',
    })).toThrow('Client navigation budget exceeded');
  });
});


describe('native graph contract', () => {
  it('rejects obsolete compiled navigation data', () => {
    const app = fixture({ Home: {} }, {});

    expect(isNativePlan(app.plan)).toBe(true);
    expect(isNativePlan({ ...app.plan, v: 1 })).toBe(false);
    expect(isNativePlan({ ...app.plan, v: 2 })).toBe(false);
  });

  it('rejects an undeclared strict reading entry before allocating interactive controls', () => {
    const app = fixture({ Caller: {}, A: { open: push('B') }, B: { back } }, {
      history: 'recent', maxDepth: 5, maxStates: 16, fallback: 'error',
    });

    expect(() => app.enter(['Caller', 'A'])).toThrow('Uncompiled client navigation history');
  });

  it('allows an explicit published entry to hand off through the server', () => {
    const navigator = createStackNavigator({ initialRouteName: 'External', screens: { External: 'foreign:entry', Home: Page } });
    const model = createModel(navigator);
    const controller = new Controller(model, { clientNavigation: { history: 'recent', fallback: 'error' } });
    const bodies = baseBodies(model);
    const trees: BodyTree[] = bodies.map(body => ({ body, element: Page(), presses: [] }));
    const plan = preparePlan(controller, trees, bodies);

    expect(() => replayPlan(controller, plan, new Map())).not.toThrow();
  });
});

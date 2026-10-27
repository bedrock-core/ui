import { describe, expect, it } from 'vitest';
import {
  Button, Panel, Screen, Text, useState, type FunctionComponent, type JSX, type PressEvent,
} from '@bedrock-core/ui-runtime';
import { bakedWalk, buildScreenOnce, probeLiveness } from '@bedrock-core/ui-runtime/compile';
import { createStackNavigator } from '../stack';
import { createStaticNavigation } from '../container';

type Press = (event: PressEvent) => unknown;
const isPress = (value: unknown): value is Press => typeof value === 'function';

function screen(body: FunctionComponent, initial: 'First' | 'Second' = 'First', tail?: JSX.Element, head?: FunctionComponent): FunctionComponent {
  const stack = createStackNavigator({ id: 'probe-navigation', initialRouteName: initial,
    screenOptions: { headerShown: false }, screens: { First: body, Second: body } });
  const Navigation = createStaticNavigation(stack);

  return () => Screen({ children: Panel({ width: 180, height: 160,
    children: [head === undefined ? undefined : { type: head, props: {} }, Navigation({}), tail] }) });
}

function inspect(root: FunctionComponent, wrap?: (press: Press) => Press) {
  let renders = 0;
  const result = probeLiveness(() => {
    renders++;
    const tree = buildScreenOnce(root);

    if (wrap !== undefined) {
      for (const node of bakedWalk(tree)) {
        const press = node.props.onPress;

        if (isPress(press)) {
          node.props.onPress = wrap(press);
        }
      }
    }

    return tree;
  });

  return { result, renders };
}

const body = (): JSX.Element => Button({ children: Text({ children: 'Action' }), onPress() {} });

describe('navigation liveness analysis', () => {
  it('shares the player guard across entry variants without repeating their renders', () => {
    for (const initial of ['First', 'Second'] as const) {
      const root = screen(body, initial);
      const optimized = inspect(root);
      const ordinary = inspect(root, press => event => press(event));

      expect(ordinary.renders).toBeGreaterThan(1);
      expect(optimized.renders).toBe(1);
      expect(optimized.result).toEqual(ordinary.result);
    }
  });

  it('retains state, look and visibility analysis in custom page components', () => {
    const root = screen((): JSX.Element => {
      const [on] = useState(false);

      return Panel({ background: on ? 'textures/ui/on' : 'textures/ui/off', children: [
        Text({ children: on ? 'enabled' : 'disabled' }),
        Panel({ visible: on, width: 10, height: 10 }),
        body(),
      ] });
    });
    const optimized = inspect(root);
    const ordinary = inspect(root, press => event => press(event));

    expect(optimized.renders).toBeGreaterThan(1);
    expect(optimized.renders).toBeLessThan(ordinary.renders);
    expect(optimized.result).toEqual(ordinary.result);
    expect(optimized.result.texts.length).toBeGreaterThan(0);
    expect(optimized.result.props.some(prop => prop.prop === 'background')).toBe(true);
    expect(optimized.result.liveVisibles.length).toBeGreaterThan(0);
  });

  it('probes wrappers that copy player-gated metadata and change state before requesting a player', () => {
    let changed = false;
    const root = screen(body, 'First', undefined, () => Text({ children: changed ? 'after!' : 'before' }));
    const result = inspect(root, (press) => {
      const wrapped: Press = (event) => { changed = true; return press(event); };

      Object.defineProperties(wrapped, Object.getOwnPropertyDescriptors(press));

      return wrapped;
    });

    expect(result.renders).toBeGreaterThan(1);
    expect(changed).toBe(true);
    expect(result.result.texts).toContain(0);
  });

  it('keeps player-gated callbacks in their original press-budget positions', () => {
    let outsidePresses = 0;
    const root = screen(() => Panel({ width: 120, height: 100, children: Array.from({ length: 70 }, () =>
      Button({ position: 'absolute', width: 2, height: 2, onPress() {} })),
    }), 'First', Button({ children: Text({ children: 'Outside' }), onPress() { outsidePresses++; } }));
    const result = inspect(root);

    expect(result.renders).toBe(1);
    expect(outsidePresses).toBe(0);
  });
});


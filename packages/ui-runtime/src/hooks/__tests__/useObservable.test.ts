import { afterEach, describe, expect, it } from 'vitest';
import type { Player } from '@minecraft/server';
import {
  __lastActionForm, __pendingShowCount, __resetFormMocks, __resolveShow, __setDeferredShows,
} from '../../__mocks__/@minecraft/server-ui';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { render } from '../../core/render/lifecycle';
import { registerCompiledScreen } from '../../core/render/screens';
import { titleFor } from '../../hosts/form/contract';
import type { FunctionComponent, JSX } from '../../jsx';
import { useObservable, type ObservableLike } from '../useObservable';

/** An observable with a setter, the smallest thing shaped like one. */
function source<T>(initial: T): ObservableLike<T> & { set(next: T): void } {
  let value = initial;
  const listeners = new Set<(next: T, prev: T) => void>();

  return {
    get: () => value,
    set(next: T): void {
      const prev = value;

      value = next;
      listeners.forEach(listener => listener(next, prev));
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
  };
}

function el(type: unknown, props: Record<string, unknown>): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- test element factory; the { type, props } shape is a JSX.Element at runtime
  return { type, props } as JSX.Element;
}

/** Flush the full microtask queue (and one macrotask turn). */
function tick(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

afterEach(() => {
  __resetFormMocks();
});

describe('useObservable on a form', () => {
  it('keeps a change like a state change: nothing is shown until the player presses', async () => {
    __setDeferredShows(true);

    const count = source(1);
    const seen: number[] = [];
    const App: FunctionComponent = () => {
      const value = useObservable(count);

      seen.push(value);

      return el(Screen, {
        children: el(Panel, {
          width: 220,
          height: 120,
          children: [
            el(Text, { maxLength: 8, children: `count ${String(value)}` }),
            el(Button, { onPress: () => undefined, children: el(Text, { children: 'press' }) }),
          ],
        }),
      });
    };

    registerCompiledScreen(App, { key: 'observable:form', title: titleFor('observable_form') });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub: an id is all a session is keyed by
    render(App, { id: 'observer' } as unknown as Player);
    await tick();

    const shown = __lastActionForm();

    expect(JSON.stringify(shown?.buttons)).toContain('count 1');

    count.set(5);
    await tick();

    // The component ran with the new value, and the form the player is looking at stayed.
    expect(seen.at(-1)).toBe(5);
    expect(__lastActionForm()).toBe(shown);
    expect(__pendingShowCount()).toBe(1);

    __resolveShow({ canceled: false, selection: 0 });
    await tick();

    expect(__lastActionForm()).not.toBe(shown);
    expect(JSON.stringify(__lastActionForm()?.buttons)).toContain('count 5');
  });
});

import { signal, type NativeSignal, type Signal } from '@bedrock-core/observable';
import type { Player } from '@minecraft/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockSignal } from '../../__mocks__/@minecraft/server';
import { __resetFormMocks, __setDeferredShows } from '../../__mocks__/@minecraft/server-ui';
import { Panel } from '../../components/Panel';
import { Screen } from '../../components/Screen';
import { Text } from '../../components/Text';
import { endRender } from '../../core/render/control';
import { render } from '../../core/render/lifecycle';
import { registerCompiledScreen } from '../../core/render/screens';
import { titleFor } from '../../hosts/form/contract';
import type { FunctionComponent } from '../../jsx';
import { useEvent } from '../useEvent';
import { useState } from '../useState';

const players: Player[] = [];
let sequence = 0;
const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));

function mount<O = never>(source: Signal<number> | NativeSignal<number, O>, seen: number[], options?: O): Player {
  const key = `events:${String(++sequence)}`;
  const App: FunctionComponent = () => {
    const [value, setValue] = useState(0);

    useEvent(source, (next) => { seen.push(next); setValue(next); }, options);

    return Screen({ children: Panel({ width: 120, height: 80, children: Text({ children: String(value), maxLength: 8 }) }) });
  };

  registerCompiledScreen(App, { key, title: titleFor(key.replace(':', '_')), snapshot: { shape: '', texts: [0], vis: [] } });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fixture only needs a player identity for its render session
  const player = { id: key } as unknown as Player;

  players.push(player);
  __setDeferredShows(true);
  render(App, player);

  return player;
}

afterEach(() => {
  for (const player of players.splice(0)) { endRender(player); }

  __resetFormMocks();
});

describe('useEvent source lifetimes', () => {
  it('uses a standard peer Signal without replay and releases mount/update listeners', async () => {
    const owner = signal<number>();
    let listeners = 0;
    const peer: Signal<number> = {
      subscribe(callback): () => void {
        listeners++;
        const release = owner.subscribe(callback);

        return (): void => { listeners--; release(); };
      },
    };
    const seen: number[] = [];
    const player = mount(peer, seen);

    await tick();
    expect(seen).toEqual([]);
    expect(listeners).toBe(1);
    owner.emit(1);
    await tick();
    expect(listeners).toBe(1);
    owner.emit(1);
    expect(seen).toEqual([1, 1]);
    endRender(player);
    expect(listeners).toBe(0);
    owner.emit(2);
    expect(seen).toEqual([1, 1]);
  });

  it('releases a native signal by callback identity without invoking it during cleanup', async () => {
    const native = new MockSignal<number>();
    const seen: number[] = [];
    const player = mount(native, seen);

    await tick();
    expect(native.__count).toBe(1);
    native.__emit(3);
    await tick();
    expect(native.__count).toBe(1);
    endRender(player);
    expect(native.__count).toBe(0);
    native.__emit(4);
    expect(seen).toEqual([3]);
  });

  it.each(['token', 'void'] as const)('forwards native options and releases a %s subscription', async (mode) => {
    type Options = { minimum: number };
    const listeners = new Set<(event: number) => void>();
    const subscribe = vi.fn((callback: (event: number) => void, options?: Options) => {
      const token = mode === 'token' ? (event: number): void => {
        if (event >= (options?.minimum ?? 0)) callback(event);
      } : callback;

      listeners.add(token);
      return mode === 'token' ? token : undefined;
    });
    const native: NativeSignal<number, Options> = {
      subscribe,
      unsubscribe(callback) { listeners.delete(callback); },
    };
    const seen: number[] = [];
    const options = { minimum: 2 };
    const player = mount(native, seen, options);

    await tick();
    expect(subscribe.mock.calls[0]?.[1]).toBe(options);
    for (const listener of [...listeners]) listener(3);
    await tick();
    expect(listeners.size).toBe(1);
    endRender(player);
    expect(listeners.size).toBe(0);
    expect(seen).toEqual([3]);
  });
});

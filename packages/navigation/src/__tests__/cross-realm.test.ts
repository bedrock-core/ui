import { stateFor } from './state';
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { afterEach, expect, it, vi } from 'vitest';

const player = { id: 'cross-realm-player' } as Player;
const handlers = new Map<string, (request: unknown) => unknown>();
const values = new Map<string, unknown>();
type RealmApi = typeof import('@bedrock-core/navigation') & Pick<typeof import('../runtime/history'), 'currentLocation' | 'navigationSnapshot'>
  & Pick<typeof import('../runtime/navigate'), 'clearPlayerNavigation' | 'setNavigator'>;
const realms: RealmApi[] = [];

async function realm(id: string) {
  // Each module instance has its own engine, as each Bedrock script realm does.
  vi.resetModules();

  const publicApi = await import('@bedrock-core/navigation');
  const { currentLocation, navigationSnapshot } = await import('../runtime/history');
  const { clearPlayerNavigation, setNavigator } = await import('../runtime/navigate');
  const api = { ...publicApi, currentLocation, navigationSnapshot, clearPlayerNavigation, setNavigator };
  const adapter = await import('@bedrock-core/navigation/core');
  const { world } = await import('@minecraft/server');

  vi.spyOn(world, 'getPlayers').mockReturnValue([player]);
  realms.push(api);
  const slots = new Map<string, unknown>();
  const core = {
    id, registered: true,
    slot: (key: string) => slots.get(key),
    fill: (key: string, value: unknown) => slots.set(key, value),
    node: { state: {
      get: (owner: string, key: string) => values.get(`${owner}|${key}`),
      set: (owner: string, key: string, value: unknown) => values.set(`${owner}|${key}`, value),
      namespaces: () => [...new Set([...values.keys()].map(key => key.split('|')[0]))],
    } },
    registry: { get: (owner: string) => handlers.has(owner) ? { id: owner } : undefined },
    rpc: {
      onRequest: (_method: string, handler: (request: unknown) => unknown) => handlers.set(id, handler),
      request: (owner: string, _method: string, request: unknown) => Promise.resolve(handlers.get(owner)?.(request)),
    },
  } as unknown as Runtime;

  return { api, service: adapter.navigation(core) };
}

afterEach(() => {
  for (const api of realms) {
    api.clearPlayerNavigation(player.id);
    api.setNavigator(undefined);
  }

  realms.length = 0;
  handlers.clear();
  values.clear();
  vi.restoreAllMocks();
});

it('round-trips the complete destination through two independent realm engines and Back', async () => {
  const a = await realm('realm-a');
  const b = await realm('realm-b');
  const openA = vi.fn(() => true);
  const openB = vi.fn(() => true);

  a.service.register({ key: 'ui-a:home', kind: 'custom', parameters: { id: { type: 'number' } } }, openA);
  b.service.register({ key: 'ui-b:detail', kind: 'custom', parameters: { id: { type: 'number' } } }, openB);
  expect(a.api.navigate).not.toBe(b.api.navigate);
  expect(await a.api.navigateAsync('ui-a:home', player, { params: { id: 7 }, checkpoint: { navigatorStates: { catalog: stateFor('catalog', 'home', 'detail') } } })).toBe(true);
  expect(await a.api.navigateAsync('ui-b:detail', player, { params: { id: 9 } })).toBe(true);
  expect(a.api.navigationSnapshot(player)).toEqual({ history: [] });
  expect(b.api.navigationSnapshot(player)).toEqual({
    current: { key: 'ui-b:detail', params: { id: 9 } },
    history: [{ key: 'ui-a:home', params: { id: 7 }, navigatorStates: { catalog: stateFor('catalog', 'home', 'detail') } }],
  });

  expect(b.api.back(player)).toBe(true);
  await vi.waitFor(() => {
    expect(a.api.currentLocation(player)).toEqual({ key: 'ui-a:home', params: { id: 7 }, navigatorStates: { catalog: stateFor('catalog', 'home', 'detail') } });
    expect(b.api.navigationSnapshot(player)).toEqual({ history: [] });
  });
  expect(a.api.navigationSnapshot(player).history).toEqual([]);
  expect(openA).toHaveBeenCalledTimes(2);
  expect(openB).toHaveBeenCalledTimes(1);
});

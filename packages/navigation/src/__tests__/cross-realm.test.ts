import { installDeclaration, stopInstallations } from '../../../../test/install';
import { stateFor } from './state';
import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@bedrock-core/server-runtime/library', async () => (await import('../../../../test/mock-registries')).registryDeclarations());

const player = { id: 'cross-realm-player' } as Player;
const providers = new Map<string, { screens: { get(): unknown }; open(request: unknown): Promise<boolean> }>();
const datasets = new Map<string, Record<string, unknown>>();
const cleanups: (() => void)[] = [];
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
  const services = new Map<string, unknown>();
  const installations: (() => void)[] = [];
  const core: Runtime = {
    id, registered: true,
    registryFixture: {
      write: (registry: string, entries: Record<string, unknown> | undefined) => { if (entries === undefined) { datasets.delete(id + registry); } else { datasets.set(id + registry, entries); } },
      read: (owner: string, registry: string) => datasets.get(owner + registry),
    },
    service: (key: string) => services.get(key),
    provideService: (key: string, value: unknown) => services.set(key, value),
    install: (declaration: Declaration<unknown>) => { return installDeclaration(core, declaration, installations); },
    registry: {
      all: () => [...providers.keys()].map(owner => ({ id: owner })),
      get: (owner: string) => providers.has(owner) ? { id: owner } : undefined,
    },
    api: {
      provideModule: (_module: string, _shape: unknown, provided: { screens: { get(): unknown }; open(request: unknown): Promise<boolean> }) => {
        providers.set(id, provided);
        return () => { providers.delete(id); };
      },
      createModule: (owner: string) => ({
        screens: { get: () => providers.get(owner)?.screens.get() },
        open: (request: unknown) => Promise.resolve(providers.get(owner)?.open(request) ?? false),
      }),
    },
  } as unknown as Runtime;

  cleanups.push(() => {
    stopInstallations(installations);
    services.clear();
  });

  return { api, service: adapter.navigation(core) };
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) { cleanup(); }
  for (const api of realms) {
    api.clearPlayerNavigation(player.id);
    api.setNavigator(undefined);
  }

  realms.length = 0;
  providers.clear();
  datasets.clear();
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

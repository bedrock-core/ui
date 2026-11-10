import { installDeclaration, stopInstallations } from '../../../../test/install';
import { stateFor } from './state';
import type { Declaration, Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { world } from '@minecraft/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPlayerNavigation, navigateAsync, setNavigator } from '../runtime/navigate';
import { currentLocation, navigationSnapshot, noteLocation } from '../runtime/history';
import { navigation, registerNavigation } from '../core';

vi.mock('@bedrock-core/server-runtime/library', async () => (await import('../../../../test/mock-registries')).registryDeclarations());

let seed = 0;
const player = { id: 'server-navigation-player' } as Player;

const cleanups: (() => void)[] = [];

function realm(declaration = registerNavigation()) {
  const id = 'owner-' + String(++seed);
  const services = new Map<string, unknown>();
  const values = new Map<string, unknown>();
  const handlers = new Map<string, (request: unknown) => unknown>();
  const providers = new Map<string, unknown>();
  const installations: (() => void)[] = [];
  const request = vi.fn<(owner: string, request: unknown) => Promise<boolean>>(() => Promise.resolve(true));
  const core: Runtime = {
    id, registered: true, service: (key: string) => services.get(key), provideService: (key: string, value: unknown) => services.set(key, value),
    registryFixture: {
      write: (_registry: string, entries: Record<string, unknown> | undefined) => { if (entries === undefined) { values.delete(id); } else { values.set(id, entries[id]); } },
      read: (owner: string) => values.get(owner) === undefined ? undefined : { [owner]: values.get(owner) },
    },
    install: (declaration: Declaration<unknown>) => { return installDeclaration(core, declaration, installations); },
    registry: {
      all: () => [...values.keys()].map(owner => ({ id: owner })),
      get: (owner: string) => values.has(owner) ? { id: owner } : undefined,
    },
    api: {
      provideModule: (module: string, _shape: unknown, provided: { open(request: unknown): Promise<boolean> }) => {
        providers.set(module, provided);
        handlers.set('open', value => provided.open(value));
        return () => { providers.delete(module); handlers.delete('open'); };
      },
      createModule: (owner: string) => ({ screens: { get: () => values.get(owner) }, open: (value: unknown) => request(owner, value) }),
    },
  } as unknown as Runtime;
  const stop = (): void => {
    stopInstallations(installations);
    services.clear();
  };

  cleanups.push(stop);
  const service = core.install(declaration);
  const foreign = (parameters = { id: { type: 'number' } }): void => {
    values.set('foreign', { v: 1, references: {}, screens: [{ key: 'different-ui:detail', kind: 'custom', parameters }] });
  };

  return { core, service, handlers, values, request, foreign, stop, providers };
}

beforeEach(() => {
  vi.spyOn(world, 'getPlayers').mockReturnValue([player]);
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) { cleanup(); }
  clearPlayerNavigation(player.id);
  setNavigator(undefined);
  vi.restoreAllMocks();
});

describe('optional Core navigation integration', () => {
  it('owns a reusable declaration independently in each Runtime', () => {
    const declaration = registerNavigation();
    const first = realm(declaration);
    const second = realm(declaration);

    expect(first.service).not.toBe(second.service);
    first.stop();
    expect(first.providers.size).toBe(0);
    expect(second.providers.size).toBe(1);
    expect(() => second.service.register({ key: `${second.core.id}:entry`, kind: 'custom', parameters: {} })).not.toThrow();
  });

  it('shares an installed service without transferring cleanup ownership to another declaration', () => {
    const { core, service, providers, stop } = realm();
    const duplicate = registerNavigation();
    const borrowed: (() => void)[] = [];

    expect(installDeclaration(core, duplicate, borrowed)).toBe(service);
    stopInstallations(borrowed);
    expect(providers.size).toBe(1);
    expect(navigation(core)).toBe(service);
    stop();
    expect(providers.size).toBe(0);
  });

  it('withdraws its module and engine listener when its runtime stops', () => {
    const unsubscribe = vi.spyOn(world.afterEvents.playerLeave, 'unsubscribe');
    const { core, service, providers, handlers, stop } = realm();

    service.register({ key: `${core.id}:entry`, kind: 'custom', parameters: {} }, () => true);
    expect(providers.size).toBe(1);
    stop();
    stop();
    expect(providers.size).toBe(0);
    expect(handlers.size).toBe(0);
    expect(service.screens.find(core.id, 'entry')).toBeUndefined();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('disposes a retained registration after the service stops without republishing', () => {
    const { core, service, values, stop } = realm();
    const release = service.register({ key: `${core.id}:entry`, kind: 'custom', parameters: {} });

    stop();
    expect(() => { release(); release(); }).not.toThrow();
    expect(values.has(core.id)).toBe(false);
  });

  it('disposes only its own registration and rejects duplicate metadata-only entries', async () => {
    const { core, service } = realm();
    const key = `${core.id}:entry`;
    const release = service.register({ key, kind: 'custom', parameters: {} });

    expect(() => service.register({ key, kind: 'custom', parameters: {} })).toThrow('already serves');
    release();
    const open = vi.fn(() => true);

    service.register({ key, kind: 'custom', parameters: {} }, open);
    release();
    expect(await navigateAsync(key, player)).toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('installs once and registers host openers with validated public inputs', async () => {
    const { core, service } = realm();
    const open = vi.fn(() => true);

    service.register({ key: `${core.id}:detail`, kind: 'custom', parameters: { id: { type: 'number' } } }, open);
    expect(navigation(core)).toBe(service);
    expect(await navigateAsync(`${core.id}:detail`, player, { params: { id: 7 } })).toBe(true);
    expect(open).toHaveBeenCalledWith(player, { params: { id: 7 }, location: { key: `${core.id}:detail`, params: { id: 7 } } });
    expect(currentLocation(player)).toEqual({ key: `${core.id}:detail`, params: { id: 7 } });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await navigateAsync(`${core.id}:detail`, player, { params: { id: 'wrong' } })).toBe(false);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('uses the publishing realm as owner when the UI namespace differs', async () => {
    const { foreign, request, service } = realm();

    foreign();
    noteLocation(player.id, { key: 'source:catalog', params: { filter: 'tools' }, navigatorStates: { main: stateFor('main', 'home', 'detail') } });
    expect(service.screens.get('different-ui:detail')?.owner).toBe('foreign');
    expect(await navigateAsync('different-ui:detail', player, { params: { id: 9 } })).toBe(true);
    expect(request).toHaveBeenCalledWith('foreign', { playerId: player.id, snapshot: {
      current: { key: 'different-ui:detail', params: { id: 9 } },
      history: [{ key: 'source:catalog', params: { filter: 'tools' }, navigatorStates: { main: stateFor('main', 'home', 'detail') } }],
    } });
    expect(navigationSnapshot(player)).toEqual({ history: [] });
  });

  it('keeps the source destination and stack when the owner rejects a handoff', async () => {
    const { foreign, request } = realm();

    foreign();
    request.mockResolvedValue(false);
    noteLocation(player.id, { key: 'source:catalog', params: { selected: 'mine' } });
    const before = navigationSnapshot(player);

    expect(await navigateAsync('different-ui:detail', player, { params: { id: 9 } })).toBe(false);
    expect(navigationSnapshot(player)).toEqual(before);
  });

  it('does not retire a newer local screen when an older handoff is acknowledged', async () => {
    const { core, service, foreign, request } = realm();
    let accept!: (value: boolean) => void;

    foreign();
    request.mockImplementation(() => new Promise(resolve => { accept = resolve; }));
    service.register({ key: `${core.id}:new`, kind: 'custom', parameters: {} }, () => true);
    noteLocation(player.id, { key: 'source:home' });
    const pending = navigateAsync('different-ui:detail', player, { params: { id: 1 } });

    expect(await navigateAsync(`${core.id}:new`, player)).toBe(true);
    accept(true);
    expect(await pending).toBe(false);
    expect(currentLocation(player)?.key).toBe(`${core.id}:new`);
    expect(navigationSnapshot(player).history).toEqual([{ key: 'source:home' }]);
  });

  it('accepts the whole incoming stack only after the registered opener succeeds', async () => {
    const { core, service, handlers } = realm();
    const open = vi.fn(() => true);
    const key = `${core.id}:detail`;

    service.register({ key, kind: 'custom', parameters: { id: { type: 'number' } } }, open);
    const snapshot = { current: { key, params: { id: 12 }, navigatorStates: { menu: stateFor('menu', 'home', 'detail') } }, history: [{ key: 'sender:home', params: { search: 'x' } }] };

    expect(await handlers.get('open')?.({ playerId: player.id, snapshot })).toBe(true);
    expect(navigationSnapshot(player)).toEqual(snapshot);
    expect(open).toHaveBeenCalledWith(player, { params: { id: 12 }, checkpoint: { navigatorStates: { menu: stateFor('menu', 'home', 'detail') } }, replace: true,
      location: { key, params: { id: 12 }, navigatorStates: { menu: stateFor('menu', 'home', 'detail') } } });
  });

  it('awaits host acceptance and restores the receiving state when opening fails', async () => {
    const { core, service, handlers } = realm();
    let reject!: (value: boolean) => void;
    const key = `${core.id}:slow`;

    service.register({ key, kind: 'custom', parameters: {} }, () => new Promise(resolve => { reject = resolve; }));
    noteLocation(player.id, { key: 'receiver:old' });
    const before = navigationSnapshot(player);
    const pending = handlers.get('open')?.({ playerId: player.id, snapshot: { current: { key }, history: [] } });

    reject(false);
    expect(await pending).toBe(false);
    expect(navigationSnapshot(player)).toEqual(before);
  });

  it('rejects malformed requests, wrong contracts and disconnected players before opening', async () => {
    const { core, service, handlers } = realm();
    const open = vi.fn(() => true);
    const key = `${core.id}:detail`;
    const receive = handlers.get('open')!;

    service.register({ key, kind: 'custom', parameters: { id: { type: 'number' } } }, open);
    expect(await receive({ playerId: player.id, snapshot: { history: [7] } })).toBe(false);
    expect(await receive({ playerId: player.id, snapshot: { current: { key, params: { id: 'wrong' } }, history: [] } })).toBe(false);
    expect(await receive({ playerId: 'gone', snapshot: { current: { key, params: { id: 1 } }, history: [] } })).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('rejects ambiguous keys and native hosts without a registered opener', async () => {
    const { core, service, foreign, values } = realm();

    foreign();
    values.set('second', values.get('foreign'));
    expect(service.screens.get('different-ui:detail')).toBeUndefined();
    service.register({ key: `${core.id}:chest`, kind: 'block', parameters: {} });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await navigateAsync(`${core.id}:chest`, player)).toBe(false);
  });
});

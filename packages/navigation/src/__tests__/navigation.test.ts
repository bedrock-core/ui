import { stateFor } from './state';
import type { Runtime } from '@bedrock-core/server-runtime';
import type { Player } from '@minecraft/server';
import { world } from '@minecraft/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPlayerNavigation, navigateAsync, setNavigator } from '../runtime/navigate';
import { currentLocation, navigationSnapshot, noteLocation } from '../runtime/history';
import { navigation } from '../core';

let seed = 0;
const player = { id: 'server-navigation-player' } as Player;

function realm() {
  const id = `owner-${++seed}`;
  const slots = new Map<string, unknown>();
  const values = new Map<string, unknown>();
  const handlers = new Map<string, (request: unknown) => unknown>();
  const request = vi.fn<(owner: string, method: string, request: unknown) => Promise<unknown>>(() => Promise.resolve(true));
  const core = {
    id, registered: true, slot: (key: string) => slots.get(key), fill: (key: string, value: unknown) => slots.set(key, value),
    node: { state: {
      get: (owner: string, key: string) => values.get(`${owner}|${key}`),
      set: (owner: string, key: string, value: unknown) => values.set(`${owner}|${key}`, value),
      namespaces: () => [...new Set([...values.keys()].map(key => key.split('|')[0]))],
    } },
    registry: { get: (owner: string) => owner === 'foreign' ? { id: owner } : undefined },
    rpc: { request, onRequest: (method: string, handler: (request: unknown) => unknown) => {
      handlers.set(method, handler);

      return () => handlers.delete(method);
    } },
  } as unknown as Runtime;
  const service = navigation(core);
  const foreign = (parameters = { id: { type: 'number' } }): void => {
    values.set('foreign|core-navigation/screens', { v: 1, references: {}, screens: [{ key: 'different-ui:detail', kind: 'custom', parameters }] });
  };

  return { core, service, handlers, values, request, foreign };
}

beforeEach(() => {
  vi.spyOn(world, 'getPlayers').mockReturnValue([player]);
});
afterEach(() => {
  clearPlayerNavigation(player.id);
  setNavigator(undefined);
  vi.restoreAllMocks();
});

describe('optional Core navigation integration', () => {
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
    expect(request).toHaveBeenCalledWith('foreign', 'core:navigation.open', { playerId: player.id, snapshot: {
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

    expect(await handlers.get('core:navigation.open')?.({ playerId: player.id, snapshot })).toBe(true);
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
    const pending = handlers.get('core:navigation.open')?.({ playerId: player.id, snapshot: { current: { key }, history: [] } });

    reject(false);
    expect(await pending).toBe(false);
    expect(navigationSnapshot(player)).toEqual(before);
  });

  it('rejects malformed requests, wrong contracts and disconnected players before opening', async () => {
    const { core, service, handlers } = realm();
    const open = vi.fn(() => true);
    const key = `${core.id}:detail`;
    const receive = handlers.get('core:navigation.open')!;

    service.register({ key, kind: 'custom', parameters: { id: { type: 'number' } } }, open);
    expect(await receive({ playerId: player.id, snapshot: { history: [7] } })).toBe(false);
    expect(await receive({ playerId: player.id, snapshot: { current: { key, params: { id: 'wrong' } }, history: [] } })).toBe(false);
    expect(await receive({ playerId: 'gone', snapshot: { current: { key, params: { id: 1 } }, history: [] } })).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });

  it('rejects ambiguous keys and native hosts without a registered opener', async () => {
    const { core, service, foreign, values } = realm();

    foreign();
    values.set('second|core-navigation/screens', values.get('foreign|core-navigation/screens'));
    expect(service.screens.get('different-ui:detail')).toBeUndefined();
    service.register({ key: `${core.id}:chest`, kind: 'block', parameters: {} });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await navigateAsync(`${core.id}:chest`, player)).toBe(false);
  });
});

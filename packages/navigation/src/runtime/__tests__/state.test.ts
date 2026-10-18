import { stateFor } from '../../__tests__/state';
import type { Player } from '@minecraft/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { back, navigate, navigateAsync, setNavigator, type Navigator } from '../navigate';
import { checkpoint, clearHistory, currentLocation, isNavigationSnapshot, navigationSnapshot, noteLocation, noteShown, restoreNavigation } from '../history';
import { registerScreenMetadata as registerScreenDescriptor, screenParametersError as screenParameterError } from '@bedrock-core/ui-runtime';

const player = { id: 'navigation-state' } as Player;

afterEach(() => {
  clearHistory(player.id);
  setNavigator(undefined);
  vi.restoreAllMocks();
});

describe('complete navigation destinations', () => {
  it('records logical inputs before a synchronous host renders its private physical screen', () => {
    let rendered;

    setNavigator((_key, shownPlayer) => {
      noteShown(shownPlayer.id, 'private:physical');
      rendered = currentLocation(shownPlayer);

      return true;
    });
    navigate('state:logical', player, { params: { section: 'audio' }, checkpoint: { navigatorStates: { menu: stateFor('menu', 'home', 'detail') } } });
    expect(rendered).toEqual({ key: 'state:logical', params: { section: 'audio' }, navigatorStates: { menu: stateFor('menu', 'home', 'detail') } });
  });

  it('reopens the previous parameters and confirmed client selections', () => {
    const shown = vi.fn(() => true);

    setNavigator(shown);
    navigate('state:detail', player, { params: { item: 'diamond', filter: { price: 10 } } });
    checkpoint(player, { navigatorStates: { guide: stateFor('guide', 'home', 'chapter'), catalog: stateFor('catalog', 'home', 'detail') } });
    navigate('state:edit', player);
    expect(back(player)).toBe(true);
    expect(shown.mock.lastCall).toEqual(['state:detail', player, {
      replace: true, params: { item: 'diamond', filter: { price: 10 } },
      checkpoint: { navigatorStates: { guide: stateFor('guide', 'home', 'chapter'), catalog: stateFor('catalog', 'home', 'detail') } },
    }]);
    expect(currentLocation(player)?.params?.item).toBe('diamond');
  });

  it('keeps Back state when its destination cannot open', () => {
    setNavigator(() => true);
    navigate('state:home', player, { params: { id: 4 } });
    navigate('state:detail', player);
    const before = navigationSnapshot(player);

    setNavigator(() => false);
    expect(back(player)).toBe(false);
    expect(navigationSnapshot(player)).toEqual(before);
  });

  it('isolates nested input and output data from the stored state', () => {
    const input = { key: 'state:home', params: { filter: { id: 3 } } };

    noteLocation(player.id, input);
    input.params.filter.id = 9;
    const copy = navigationSnapshot(player);

    (copy.current?.params?.filter as { id: number }).id = 12;
    expect(currentLocation(player)?.params).toEqual({ filter: { id: 3 } });
  });

  it('copies caller inputs before dispatching an asynchronous host', async () => {
    let accept!: (value: boolean) => void;
    const show = vi.fn<Navigator>(() => new Promise<boolean>(resolve => { accept = resolve; }));
    const params = { filter: { id: 3 } };
    const selection = { navigatorStates: { catalog: stateFor('catalog', 'home', 'detail') } };

    setNavigator(show);
    const pending = navigateAsync('state:slow', player, { params, checkpoint: selection });

    params.filter.id = 9;
    selection.navigatorStates.catalog.routes[1].name = 'changed';
    accept(true);
    expect(await pending).toBe(true);
    expect(show.mock.lastCall?.[2]).toEqual({ params: { filter: { id: 3 } }, checkpoint: { navigatorStates: { catalog: stateFor('catalog', 'home', 'detail') } } });
    expect(currentLocation(player)).toEqual({ key: 'state:slow', params: { filter: { id: 3 } }, navigatorStates: { catalog: stateFor('catalog', 'home', 'detail') } });
  });

  it('rejects malformed client context before invoking a host or changing history', () => {
    noteLocation(player.id, { key: 'state:home' });
    const before = navigationSnapshot(player);
    const show = vi.fn(() => true);

    setNavigator(show);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(navigate('state:detail', player, { checkpoint: { navigatorStates: { catalog: { ...stateFor('catalog', 'home'), index: 1.5 } } } })).toBe(false);
    expect(navigate('state:detail', player, { checkpoint: { navigatorStates: { guide: { ...stateFor('guide', 'home'), routes: [7] } } } } as never)).toBe(false);
    expect(show).not.toHaveBeenCalled();
    expect(navigationSnapshot(player)).toEqual(before);
  });

  it('restores a transferred stack and preserves each destination on Back', () => {
    restoreNavigation(player, { current: { key: 'realm-b:edit', params: { id: 9 } }, history: [
      { key: 'realm-a:catalog', navigatorStates: { selected: stateFor('selected', 'home', 'detail') } },
      { key: 'realm-a:detail', params: { id: 9 } },
    ] });
    const show = vi.fn(() => true);

    setNavigator(show);
    back(player);
    expect(currentLocation(player)).toMatchObject({ key: 'realm-a:detail', params: { id: 9 } });
    back(player);
    expect(currentLocation(player)).toMatchObject({ key: 'realm-a:catalog', navigatorStates: { selected: stateFor('selected', 'home', 'detail') } });
    expect(navigationSnapshot(player).history).toEqual([]);
    expect(back(player)).toBe(false);
    expect(show).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed or nonserializable wire state without overwriting the player', () => {
    noteLocation(player.id, { key: 'state:home' });
    expect(isNavigationSnapshot({ history: [7] })).toBe(false);
    expect(isNavigationSnapshot({ current: { key: 'bad', params: { callback: () => 1 } }, history: [] })).toBe(false);
    expect(() => restoreNavigation(player, { history: [null] } as never)).toThrow();
    expect(currentLocation(player)?.key).toBe('state:home');
  });

  it('ignores an older asynchronous result after another navigation succeeds', async () => {
    let resolve!: (value: boolean) => void;

    setNavigator(key => key === 'state:slow' ? new Promise<boolean>(done => { resolve = done; }) : true);
    navigate('state:home', player);
    const pending = navigateAsync('state:slow', player);

    navigate('state:new', player);
    resolve(false);
    expect(await pending).toBe(false);
    expect(currentLocation(player)?.key).toBe('state:new');
    expect(navigationSnapshot(player).history).toEqual([{ key: 'state:home' }]);
  });
});

describe('public screen parameter contracts', () => {
  const contract = {
    item: { type: 'string' }, scope: { type: 'string', enum: ['player', 'server'], optional: true },
    options: { type: 'object', properties: { enabled: { type: 'boolean' } }, optional: true },
    values: { type: 'array', items: { type: 'number' }, optional: true },
  } as const;

  it('checks required, unknown, enum and nested parameters', () => {
    expect(screenParameterError(contract, { item: 'diamond', options: { enabled: true }, values: [1, 2] })).toBeUndefined();
    expect(screenParameterError(contract, {})).toContain('item is required');
    expect(screenParameterError(contract, { item: 2 })).toContain('item must be string');
    expect(screenParameterError(contract, { item: 'x', extra: 2 })).toContain('extra is not declared');
    expect(screenParameterError(contract, { item: 'x', scope: 'world' })).toContain('not an accepted value');
    expect(screenParameterError(contract, { item: 'x', options: { enabled: 1 } })).toContain('options.enabled');
    expect(screenParameterError(contract, { item: 'x', values: [NaN] })).toContain('plain data');
  });

  it('refuses an invalid navigation before it changes history or invokes a host', () => {
    registerScreenDescriptor({ key: 'state:contract', kind: 'custom', parameters: contract });
    const show = vi.fn(() => true);

    setNavigator(show);
    navigate('state:home', player);
    const before = navigationSnapshot(player);

    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(navigate('state:contract', player, { params: { item: false } })).toBe(false);
    expect(show).toHaveBeenCalledTimes(1);
    expect(navigationSnapshot(player)).toEqual(before);
  });
});

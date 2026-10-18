import { afterEach, describe, expect, it, vi } from 'vitest';
import { Panel } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import { createStackNavigator } from '../stack';
import { createTopTabNavigator } from '../tabs';
import { Controller } from '../controller';
import { createModel } from '../state';
import { baseBodies, scopeOf } from '../plan';
import { registerAdapter } from '../adapters';
import { NAVIGATION_ADAPTER } from '../symbols';
import { clearHistory, currentLocation, noteLocation } from '../../runtime/history';

const player = { id: 'static-controller' } as Player;
const Page = () => Panel({});
afterEach(() => { clearHistory(player.id); vi.restoreAllMocks(); });

function fixture() {
  const model = createModel(createStackNavigator({ screens: { A: Page, B: Page, Foreign: 'different-ui:entry' } }));
  const unhandled = vi.fn();
  const controller = new Controller(model, { clientNavigation: { mode: 'server' } }, player, undefined, { onUnhandledAction: unhandled });
  controller.activate();
  controller.commit();
  const bodies = baseBodies(model);
  return { controller, a: scopeOf(controller, bodies[0]), b: scopeOf(controller, bodies[1]), unhandled };
}

describe('server-confirmed navigation policy', () => {
  it('checkpoints a completed server transition and restores that page and its history', () => {
    noteLocation(player.id, { key: 'local:root' });
    const { controller } = fixture();

    controller.dispatch({ type: 'NAVIGATE', payload: { name: 'B' } });
    const saved = currentLocation(player)?.navigatorStates?.root;

    expect(saved?.routes.map(route => route.name)).toEqual(['A', 'B']);
    expect(saved?.index).toBe(1);
    const restored = new Controller(controller.model, {}, player);

    expect(restored.getState()).toEqual(saved);
    controller.dispatch({ type: 'GO_BACK' });
    expect(currentLocation(player)?.navigatorStates?.root.routes.map(route => route.name)).toEqual(['A']);
  });

  it('replaces the initial host when its first route is a published destination', async () => {
    const model = createModel(createStackNavigator({ screens: { Foreign: 'different-ui:entry' } }));
    const open = vi.fn(async () => true);
    const adapter = { [NAVIGATION_ADAPTER]: true as const };
    registerAdapter(adapter, { open });
    noteLocation(player.id, { key: 'local:root' });
    const controller = new Controller(model, { adapter }, player);
    controller.activate(); controller.commit();
    await Promise.resolve();
    expect(open).toHaveBeenCalledWith('different-ui:entry', player, undefined, { replace: true });
  });
  it('checkpoints the surviving local stack when replacing its last page with a published route', async () => {
    const model = createModel(createStackNavigator({ screens: { A: Page, B: Page, Foreign: 'different-ui:entry' } }));
    const open = vi.fn(async () => true);
    const adapter = { [NAVIGATION_ADAPTER]: true as const };
    registerAdapter(adapter, { open });
    noteLocation(player.id, { key: 'local:root' });
    const controller = new Controller(model, { adapter }, player);
    controller.activate(); controller.commit();
    controller.dispatch({ type: 'NAVIGATE', payload: { name: 'B' } });
    controller.dispatch({ type: 'REPLACE', payload: { name: 'Foreign' } });
    await Promise.resolve();
    expect(open).toHaveBeenCalledWith('different-ui:entry', player, undefined);
    expect(currentLocation(player)?.navigatorStates?.root.routes.map(route => route.name)).toEqual(['A']);
  });
  it('restores the original checkpoint after a rejected published replacement', async () => {
    const model = createModel(createStackNavigator({ screens: { A: Page, B: Page, Foreign: 'different-ui:entry' } }));
    const open = vi.fn(async () => false);
    const adapter = { [NAVIGATION_ADAPTER]: true as const };
    registerAdapter(adapter, { open });
    noteLocation(player.id, { key: 'local:root' });
    const controller = new Controller(model, { adapter }, player, undefined, { onUnhandledAction: vi.fn() });
    controller.activate(); controller.commit();
    controller.dispatch({ type: 'NAVIGATE', payload: { name: 'B' } });
    controller.dispatch({ type: 'REPLACE', payload: { name: 'Foreign' } });
    await Promise.resolve();
    expect(currentLocation(player)?.navigatorStates?.root.routes.map(route => route.name)).toEqual(['A', 'B']);
  });
  it('delivers a preventable tabPress when the selected tab is pressed again', () => {
    const model = createModel(createTopTabNavigator({ screens: { A: Page, B: Page } }));
    const controller = new Controller(model, { clientNavigation: { mode: 'server' } }, player);
    const scope = scopeOf(controller, baseBodies(model)[0]);
    const press = vi.fn();
    controller.configure(scope, { tabPress: press });
    controller.activate(); controller.commit();
    controller.dispatch({ type: 'JUMP_TO', payload: { name: 'A' } });
    expect(press).toHaveBeenCalledTimes(1);
    controller.dispose(); controller.activate(); controller.commit();
    controller.dispatch({ type: 'JUMP_TO', payload: { name: 'A' } });
    expect(press).toHaveBeenCalledTimes(1);
  });
  it('delivers initial focus after screen listeners are registered and commits readiness once', () => {
    const model = createModel(createStackNavigator({ screens: { A: Page } }));
    const ready = vi.fn(); const focus = vi.fn();
    const controller = new Controller(model, {}, player, undefined, { onReady: ready });
    controller.activate();
    controller.addListener(scopeOf(controller, baseBodies(model)[0]), 'focus', focus);
    controller.commit(); controller.commit();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
  });
  it('emits focus, blur, and scoped state events, and removes disposed listeners', () => {
    const { controller, a, b } = fixture();
    const focus = vi.fn(); const blur = vi.fn(); const state = vi.fn();
    controller.addListener(a, 'blur', blur);
    const release = controller.addListener(b, 'focus', focus);
    controller.addListener(a, 'state', state);
    controller.dispatch({ type: 'NAVIGATE', payload: { name: 'B' } });
    expect(blur).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(state).toHaveBeenCalledTimes(1);
    expect(state.mock.calls[0][0].data.state.routes.map((route: { name: string }) => route.name)).toEqual(['A', 'B']);
    release(); release();
    controller.dispatch({ type: 'GO_BACK' });
    controller.dispatch({ type: 'NAVIGATE', payload: { name: 'B' } });
    expect(focus).toHaveBeenCalledTimes(1);
  });
  it('keeps a guarded stack until removal is allowed', () => {
    const { controller, b } = fixture(); const blocked = vi.fn();
    controller.dispatch({ type: 'NAVIGATE', payload: { name: 'B' } });
    const release = controller.prevent(b, blocked);
    controller.dispatch({ type: 'GO_BACK' });
    expect(blocked).toHaveBeenCalledWith({ type: 'GO_BACK' });
    expect(controller.state.routes.at(-1)?.name).toBe('B');
    release(); controller.dispatch({ type: 'GO_BACK' });
    expect(controller.state.routes.at(-1)?.name).toBe('A');
  });
  it('rejects unavailable destinations and changes to compiled header geometry', () => {
    const { controller, a, unhandled } = fixture();
    controller.availability.set('root/B', false);
    controller.dispatch({ type: 'NAVIGATE', payload: { name: 'B' } });
    expect(unhandled).toHaveBeenCalledTimes(1);
    expect(controller.state.routes.at(-1)?.name).toBe('A');
    controller.setOptions(a, { title: 'Updated' });
    expect(controller.optionsFor(a).title).toBe('Updated');
    expect(() => controller.setOptions(a, { headerShown: false })).toThrow('geometry');
  });
  it('keeps the current root on a failed Core handoff and supplies its complete return checkpoint', async () => {
    const model = createModel(createStackNavigator({ screens: { A: Page, B: Page, Foreign: 'different-ui:entry' } }));
    const unhandled = vi.fn(); const open = vi.fn(async () => false);
    const adapter = { [NAVIGATION_ADAPTER]: true as const };
    registerAdapter(adapter, { open });
    const controller = new Controller(model, { adapter }, player, undefined, { onUnhandledAction: unhandled });
    noteLocation(player.id, { key: 'local:root' });
    controller.activate();
    controller.commit();
    controller.dispatch({ type: 'NAVIGATE', payload: { name: 'B' } });
    const before = controller.getState();
    controller.dispatch({ type: 'NAVIGATE', payload: { name: 'Foreign', params: { id: 'iron' } } });
    await Promise.resolve();
    expect(open).toHaveBeenCalledWith('different-ui:entry', player, { id: 'iron' });
    expect(controller.getState()).toEqual(before);
    expect(currentLocation(player)?.navigatorStates?.root).toEqual(before);
    expect(unhandled).toHaveBeenCalledTimes(1);
  });
});

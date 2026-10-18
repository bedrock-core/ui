import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Player } from '@minecraft/server';
import {
  Button, Panel, Screen, Text, childElements, compiledValuesOf, endRender, registerCompiledScreen, render,
  type FunctionComponent, type JSX,
} from '@bedrock-core/ui-runtime';
import {
  CommonActions, Link, createNavigationContainerRef, createStackNavigator, createTopTabNavigator, createStaticNavigation, useNavigation, usePreventRemove, useFocusEffect,
} from '@bedrock-core/navigation';
import { compileFormScreen } from '../hosts/form/compile';
import { playerOwner } from '../../../ui-runtime/src/core/fabric';
import { buildTree } from '../../../ui-runtime/src/core/render/tree';
import { getSessionRoot } from '../../../ui-runtime/src/core/render/session';
import {
  __lastActionForm, __pendingShowCount, __resetFormMocks, __resolveShow, __setDeferredShows,
} from '../../../ui-runtime/src/__mocks__/@minecraft/server-ui';
import type { NativePlan } from '../../../navigation/src/static/plan';
import type { NavigationState } from '../../../navigation/src/static/common';

const node = (type: unknown, props: Record<string, unknown> = {}): JSX.Element => ({ type: type as FunctionComponent, props });
const player = (id: string): Player => ({ id, inputPermissions: { isPermissionCategoryEnabled: () => true, setPermissionCategory: vi.fn() } }) as unknown as Player;
const one = player('static-navigation-one'); const two = player('static-navigation-two');
const link = (screen: string) => node(Link, { screen, width: 70, height: 20, children: node(Text, { children: screen }) });

afterEach(() => { endRender(one); endRender(two); __resetFormMocks(); vi.restoreAllMocks(); });

function fixture(server = false, guarded = false) {
  const observed: NavigationState[] = [];
  const guard = vi.fn(); const ready = vi.fn();
  const A = () => Panel({ children: [link('B'), link('C')] });
  const B = () => {
    const navigation = useNavigation();
    if (guarded) { usePreventRemove(true, guard); }
    return Panel({ children: [link('C'), node(Button, { testName: 'Save', onPress: () => observed.push(navigation.getState()), children: node(Text, { children: 'Save' }) }),
      node(Link, { action: CommonActions.goBack(), children: node(Text, { children: 'Back' }) })] });
  };
  const Root = createStackNavigator({ screens: { A, B, C: () => Panel({ children: link('A') }) }, screenOptions: { headerShown: false } });
  const ref = createNavigationContainerRef<typeof Root>();
  const Navigation = createStaticNavigation(Root, { clientNavigation: { mode: server ? 'server' : 'auto', maxDepth: 2, maxStates: 12 } });
  const App = () => Screen({ children: node(Navigation, { ref, onReady: ready }) });
  const compiled = compileFormScreen(App, { namespace: 'static_runtime', name: `root_${Number(server)}_${Number(guarded)}` });
  registerCompiledScreen(App, { key: `static_runtime:root_${Number(server)}_${Number(guarded)}`, title: compiled.title, snapshot: compiled.snapshot });
  const plan = compiled.snapshot.data?.['navigation:root'] as NativePlan;
  return { App, ref, compiled, plan, observed, guard, ready };
}

function activeInputs(player: Player, nativeIndex: number, caption: string): { tree: JSX.Element; inputs: JSX.Element[] } {
  const owner = playerOwner(player);
  const tree = buildTree(getSessionRoot(owner)!, owner, true);
  const inputs: JSX.Element[] = [];
  const visit = (element: JSX.Element, reachable: boolean): void => {
    const indexes = element.props.selectionIndexes ?? [element.props.selectionIndex];
    const active = element.props.selectionActiveIndexes;
    if (element.props.selectionGroup !== undefined) {
      reachable = reachable && Array.isArray(indexes) && indexes.includes(nativeIndex) && (!Array.isArray(active) || active.includes(nativeIndex));
    }
    if (reachable && (element.type === 'button' || (element.type === 'swap-slot' && element.props.passive !== true))
      && element.props.testName === caption) { inputs.push(element); }
    for (const child of childElements(element.props.children)) { visit(child, reachable); }
  };
  visit(tree, true);
  return { tree, inputs };
}

function pressEntry(player: Player, snapshot: Parameters<typeof compiledValuesOf>[1], nativeIndex: number, caption: string): number {
  const { tree, inputs } = activeInputs(player, nativeIndex, caption);
  const { entries } = compiledValuesOf(tree, snapshot);
  const selected = inputs.find(input => input.type === 'button');
  const entry = entries.find(entry => entry.element === selected);
  if (entry === undefined) { throw new Error(`No active server input for ${caption} at native context ${nativeIndex}.`); }
  return entry.entry;
}

describe('static root runtime and refs', () => {
  it('uses server fallback when a retained child differs from the compiled native destination', async () => {
    const Page = () => Panel({});
    const Root = createTopTabNavigator({ screens: {
      Shop: createStackNavigator({ screens: { Products: Page, Product: Page }, screenOptions: { headerShown: false } }), Settings: Page,
    }, tabBar: ({ actions }) => Panel({ height: 24, children: node(Link, { action: actions.Shop, testName: 'Shop' }) }) });
    const ref = createNavigationContainerRef<typeof Root>();
    const Navigation = createStaticNavigation(Root);
    const App = () => Screen({ children: node(Navigation, { ref }) });
    const compiled = compileFormScreen(App, { namespace: 'static_runtime', name: 'retained' });
    registerCompiledScreen(App, { key: 'static_runtime:retained', title: compiled.title, snapshot: compiled.snapshot });
    __setDeferredShows(true); render(App, one);
    let previous = __lastActionForm();
    ref.forPlayer(one).navigate('Shop', { screen: 'Product' });
    await vi.waitFor(() => expect(__lastActionForm()).not.toBe(previous));
    previous = __lastActionForm();
    ref.forPlayer(one).navigate('Settings');
    await vi.waitFor(() => expect(__lastActionForm()).not.toBe(previous));
    expect(activeInputs(one, 0, 'Shop').inputs.map(input => input.type)).toEqual(['button']);
    const selection = pressEntry(one, compiled.snapshot, 0, 'Shop');
    __resolveShow({ canceled: false, selection });
    await vi.waitFor(() => expect(ref.forPlayer(one).getCurrentRoute()?.name).toBe('Product'));
  });
  it('switches custom header Back variants with the native history context', () => {
    const Root = createStackNavigator({ screens: { A: () => Panel({ children: link('B') }), B: () => Panel({}) },
      screenOptions: { header: ({ back, backAction }) => Panel({ height: 24, children: back === undefined
        ? node(Text, { children: 'Root header' })
        : node(Link, { action: backAction, testName: 'Custom Back', children: node(Text, { children: 'Back' }) }) }) } });
    const ref = createNavigationContainerRef<typeof Root>();
    const Navigation = createStaticNavigation(Root);
    const App = () => Screen({ children: node(Navigation, { ref }) });
    const compiled = compileFormScreen(App, { namespace: 'static_runtime', name: 'custom_header' });
    registerCompiledScreen(App, { key: 'static_runtime:custom_header', title: compiled.title, snapshot: compiled.snapshot });
    const plan = compiled.snapshot.data?.['navigation:root'] as NativePlan;
    const localB = plan.contexts.findIndex(context => context.origin === 'page_0' && context.body === 'page_1' && context.via.length === 1);
    expect(localB).toBeGreaterThan(0);
    __setDeferredShows(true); render(App, one);
    expect(activeInputs(one, 0, 'Custom Back').inputs).toHaveLength(0);
    expect(activeInputs(one, localB, 'Custom Back').inputs.map(input => input.type)).toEqual(['swap-slot']);
  });
  it('selects an available initial route and delivers focus hooks for that route', async () => {
    const focused = vi.fn(); const cleanup = vi.fn();
    const B = () => { useFocusEffect(() => { focused(); return cleanup; }); return Panel({}); };
    const Root = createStackNavigator({ screens: { A: { screen: () => Panel({}), if: () => false }, B }, screenOptions: { headerShown: false } });
    const ref = createNavigationContainerRef<typeof Root>();
    const Navigation = createStaticNavigation(Root, { clientNavigation: { mode: 'server' } });
    const App = () => Screen({ children: node(Navigation, { ref }) });
    const compiled = compileFormScreen(App, { namespace: 'static_runtime', name: 'conditional' });
    focused.mockClear(); cleanup.mockClear();
    registerCompiledScreen(App, { key: 'static_runtime:conditional', title: compiled.title, snapshot: compiled.snapshot });
    __setDeferredShows(true); render(App, one);
    await vi.waitFor(() => expect(ref.forPlayer(one).getCurrentRoute()?.name).toBe('B'));
    expect(focused).toHaveBeenCalledTimes(1);
    endRender(one);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
  it('checkpoints the actual local page before an ordinary callback and preserves it on the next presentation', async () => {
    const { App, ref, compiled, plan, observed, ready } = fixture();
    __setDeferredShows(true); render(App, one);
    expect(ref.forPlayer(one).isReady()).toBe(true);
    const localB = plan.edges['0:page_0/0'];
    expect(localB).toBeGreaterThan(0);
    expect(ref.forPlayer(one).getCurrentRoute()?.name).toBe('A');
    const selection = pressEntry(one, compiled.snapshot, localB, 'Save');
    const previous = __lastActionForm();
    __resolveShow({ canceled: false, selection });
    await vi.waitFor(() => { expect(observed).toHaveLength(1); expect(__lastActionForm()).not.toBe(previous); });
    expect(observed[0].routes.map(route => route.name)).toEqual(['A', 'B']);
    expect(ref.forPlayer(one).getCurrentRoute()?.name).toBe('B');
    expect(__lastActionForm()?.buttons).toHaveLength(compiled.entries.length);
    expect(ready).toHaveBeenCalledTimes(1);
  });
  it('navigates from commands while retaining the root and keeping players isolated', async () => {
    const { App, ref, ready } = fixture();
    expect(ref.forPlayer(one).isReady()).toBe(false);
    expect(() => ref.forPlayer(one).navigate('B')).toThrow('mounted');
    __setDeferredShows(true); render(App, one); render(App, two);
    expect(__pendingShowCount()).toBe(2);
    const before = __lastActionForm();
    ref.forPlayer(one).navigate('B');
    await vi.waitFor(() => { expect(ref.forPlayer(one).getCurrentRoute()?.name).toBe('B'); expect(__pendingShowCount()).toBe(2); expect(__lastActionForm()).not.toBe(before); });
    expect(ref.forPlayer(two).getCurrentRoute()?.name).toBe('A');
    expect(ref.forPlayer(one).getRootState()?.routes.map(route => route.name)).toEqual(['A', 'B']);
    expect(ready).toHaveBeenCalledTimes(2);
    endRender(one);
    expect(ref.forPlayer(one).isReady()).toBe(false);
    expect(ref.forPlayer(two).isReady()).toBe(true);
  });
  it('guards removal on server routes while native cancellation dismisses the root', async () => {
    const { App, ref, guard } = fixture(true, true);
    __setDeferredShows(true); render(App, one);
    const before = __lastActionForm();
    ref.forPlayer(one).navigate('B');
    await vi.waitFor(() => { expect(__pendingShowCount()).toBe(1); expect(__lastActionForm()).not.toBe(before); });
    ref.forPlayer(one).goBack();
    expect(guard).toHaveBeenCalledWith({ data: { action: { type: 'GO_BACK' } } });
    expect(ref.forPlayer(one).getCurrentRoute()?.name).toBe('B');
    __resolveShow({ canceled: true });
    await vi.waitFor(() => expect(ref.forPlayer(one).isReady()).toBe(false));
  });
  it('rejects lifecycle hooks on an automatically local route at build time', () => {
    expect(() => fixture(false, true)).toThrow("bedrock.navigation: 'server'");
  });
});

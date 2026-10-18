import { describe, expect, it } from 'vitest';
import { Panel } from '@bedrock-core/ui-runtime';
import { createStackNavigator } from '../stack';
import { createTopTabNavigator } from '../tabs';
import { createModel, initialState, reduce, focused, leaf, stateAt, restoreState, isNavigationState } from '../state';
import { createScreenReference } from '../definitions';
import type { NavigationAction, NavigationState, StaticScreenProps } from '../common';

const Page = () => Panel({});
const basic = () => createModel(createStackNavigator({ screens: { Home: Page, Detail: Page, Other: Page } }));
const move = (name: string, params?: object): NavigationAction => ({ type: 'NAVIGATE', payload: { name, ...params === undefined ? {} : { params } } });
const names = (state: NavigationState) => state.routes.map(route => route.name);

describe('static stack state', () => {
  it('updates an explicitly sourced route and clears optional params without storing undefined', () => {
    const model = basic();
    const state = reduce(model, initialState(model), move('Detail', { id: 1 })).state;
    const source = state.routes[0].key;
    const updated = reduce(model, state, { type: 'SET_PARAMS', source, payload: { params: { edited: true } } }).state;
    expect(updated.routes[0].params).toEqual({ edited: true });
    expect(focused(updated).params).toEqual({ id: 1 });
    const cleared = reduce(model, updated, { type: 'REPLACE_PARAMS', payload: {} }).state;
    expect('params' in focused(cleared)).toBe(false);
    expect(isNavigationState(cleared)).toBe(true);
    expect(reduce(model, state, { type: 'SET_PARAMS', source: 'absent', payload: { params: {} } }).handled).toBe(false);
  });
  it('navigates, updates the focused route, and retains distinct visits to the same page', () => {
    const model = basic(); let state = initialState(model);
    state = reduce(model, state, move('Detail', { id: 1 })).state;
    const key = focused(state).key;
    state = reduce(model, state, move('Detail', { id: 2 })).state;
    expect(names(state)).toEqual(['Home', 'Detail']);
    expect(focused(state)).toMatchObject({ key, params: { id: 2 } });
    state = reduce(model, state, move('Other')).state;
    state = reduce(model, state, move('Detail', { id: 3 })).state;
    expect(names(state)).toEqual(['Home', 'Detail', 'Other', 'Detail']);
    expect(focused(state).key).not.toBe(key);
    state = reduce(model, state, { type: 'GO_BACK' }).state;
    expect(focused(state).name).toBe('Other');
  });
  it('pushes identical screens and distinguishes parameter history from screen dismissal', () => {
    const model = basic(); let state = initialState(model);
    state = reduce(model, state, { type: 'PUSH', payload: { name: 'Detail', params: { id: 1 } } }).state;
    state = reduce(model, state, { type: 'PUSH_PARAMS', payload: { params: { id: 2 } } }).state;
    expect(state.index).toBe(2);
    expect(reduce(model, state, { type: 'GO_BACK' }).state.routes.at(-1)?.params).toEqual({ id: 1 });
    expect(names(reduce(model, state, { type: 'DISMISS', payload: { count: 1 } }).state)).toEqual(['Home']);
    state = reduce(model, state, { type: 'PUSH', payload: { name: 'Detail', params: { id: 2 } } }).state;
    expect(new Set(state.routes.map(route => route.key)).size).toBe(3);
  });
  it('replaces, pops to a visited route, and replaces when popTo cannot find one', () => {
    const model = basic(); let state = initialState(model);
    state = reduce(model, state, move('Detail')).state;
    state = reduce(model, state, move('Other')).state;
    state = reduce(model, state, { type: 'POP_TO', payload: { name: 'Detail' } }).state;
    expect(names(state)).toEqual(['Home', 'Detail']);
    state = reduce(model, state, { type: 'REPLACE', payload: { name: 'Other' } }).state;
    expect(names(state)).toEqual(['Home', 'Other']);
    state = reduce(model, state, { type: 'POP_TO', payload: { name: 'Detail' } }).state;
    expect(names(state)).toEqual(['Home', 'Detail']);
    expect(names(reduce(model, state, { type: 'POP_TO_TOP' }).state)).toEqual(['Home']);
  });
  it('uses getId for route identity and copies JSON params', () => {
    const model = createModel(createStackNavigator({ screens: {
      Home: Page,
      Detail: { screen: (_props: StaticScreenProps<{ id: string }>) => Panel({}), getId: ({ params }: { params: { id: string } }) => params.id },
    } }));
    const params = { id: 'a', nested: { count: 1 } };
    let state = reduce(model, initialState(model), move('Detail', params)).state;
    params.nested.count = 99;
    expect(focused(state).params).toEqual({ id: 'a', nested: { count: 1 } });
    state = reduce(model, state, move('Detail', { id: 'b' })).state;
    expect(state.routes).toHaveLength(3);
    state = reduce(model, state, move('Detail', { id: 'a' })).state;
    expect(state.routes).toHaveLength(2);
    expect(() => reduce(model, state, move('Detail', { value: NaN }))).toThrow('JSON');
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    expect(() => reduce(model, state, move('Detail', cyclic))).toThrow('JSON');
  });
  it('rejects empty, duplicate and invalid restoration or navigator configuration', () => {
    expect(() => createStackNavigator({ screens: {} })).toThrow('at least one');
    expect(() => createStackNavigator({ screens: { Home: Page }, groups: { Duplicate: { screens: { Home: Page } } } })).toThrow('duplicate');
    const model = basic();
    expect(() => initialState(model, { routes: [] })).toThrow('requires a route');
    expect(() => initialState(model, { routes: [{ name: 'Missing' }] })).toThrow('Unknown route');
    expect(() => initialState(model, { index: 9, routes: [{ name: 'Home' }] })).toThrow('index');
    expect(() => initialState(model, { routes: [{ name: 'Home', state: { routes: [{ name: 'Other' }] } }] })).toThrow('Leaf');
    expect(() => reduce(model, initialState(model), { type: 'POP', payload: { count: -1 } })).toThrow('positive');
  });
});

describe('top tabs and nested stacks', () => {
  const tree = (backBehavior: 'history' | 'firstRoute' | 'order' | 'none' | 'fullHistory' = 'history') => createModel(createStackNavigator({ screens: {
    Home: createTopTabNavigator({ backBehavior, screens: {
      Shop: createStackNavigator({ screens: { Products: Page, Product: Page } }), Settings: Page,
    } }), About: Page,
  } }));
  it('keeps each tab stack and bubbles Back from a child before leaving a parent', () => {
    const model = tree(); let state = initialState(model);
    state = reduce(model, state, move('Product', { id: 'iron' })).state;
    expect(leaf(state).name).toBe('Product');
    state = reduce(model, state, { type: 'JUMP_TO', payload: { name: 'Settings' } }).state;
    expect(leaf(state).name).toBe('Settings');
    state = reduce(model, state, { type: 'JUMP_TO', payload: { name: 'Shop' } }).state;
    expect(leaf(state)).toMatchObject({ name: 'Product', params: { id: 'iron' } });
    state = reduce(model, state, { type: 'GO_BACK' }).state;
    expect(leaf(state).name).toBe('Products');
    state = reduce(model, state, { type: 'GO_BACK' }).state;
    expect(leaf(state).name).toBe('Settings');
  });
  it('implements first/order/none/history Back policies', () => {
    for (const behavior of ['firstRoute', 'order', 'none', 'history'] as const) {
      const model = tree(behavior); let state = initialState(model);
      state = reduce(model, state, { type: 'JUMP_TO', payload: { name: 'Settings' } }).state;
      const back = reduce(model, state, { type: 'GO_BACK' });
      expect(back.handled).toBe(behavior !== 'none');
      if (back.handled) { expect(leaf(back.state).name).toBe('Products'); }
    }
  });
  it('preserves tab parameter history and restores the previous parameters on Back', () => {
    const model = createModel(createTopTabNavigator({ backBehavior: 'fullHistory', screens: { A: Page, B: Page } }));
    let state = reduce(model, initialState(model), move('A', { page: 1 })).state;
    state = reduce(model, state, { type: 'PUSH_PARAMS', payload: { params: { page: 2 } } }).state;
    state = reduce(model, state, { type: 'GO_BACK' }).state;
    expect(focused(state).params).toEqual({ page: 1 });
  });
  it('validates nested restoration against its containing navigator', () => {
    const model = tree();
    const state = initialState(model, { routes: [{ name: 'Home', state: { routes: [{ name: 'Shop', state: { routes: [{ name: 'Product', params: { id: 'gold' } }] } }] } }] });
    expect(leaf(state)).toMatchObject({ name: 'Product', params: { id: 'gold' } });
    expect(stateAt(state, 'root/Home')?.routes).toHaveLength(2);
    expect(() => initialState(model, { routes: [{ name: 'Home', state: { routes: [{ name: 'Product' }] } }] })).toThrow('Unknown route');
  });
  it('registers fixed and discovered published destinations as ordinary route definitions', () => {
    const model = createModel(createStackNavigator({ screens: { Home: Page, Catalog: 'economy:catalog', Published: createScreenReference() } }));
    const state = reduce(model, initialState(model), move('Published', { screen: 'shop:product', params: { id: 'iron' } })).state;
    expect(focused(state).params).toEqual({ screen: 'shop:product', params: { id: 'iron' } });
  });
  it('restores tab history and logical keys from a confirmed portable checkpoint', () => {
    const model = tree(); let state = initialState(model);
    state = reduce(model, state, move('Product', { id: 'iron' })).state;
    state = reduce(model, state, { type: 'JUMP_TO', payload: { name: 'Settings' } }).state;
    const restored = restoreState(model, JSON.parse(JSON.stringify(state)));
    expect(restored).toEqual(state);
    expect(leaf(reduce(model, restored, { type: 'GO_BACK' }).state).name).toBe('Product');
    expect(isNavigationState({ ...state, index: 99 })).toBe(false);
    expect(() => restoreState(model, { ...state, routeNames: ['Unknown'] })).toThrow('Incompatible');
  });
});

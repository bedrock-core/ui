import { describe, expect, it } from 'vitest';
import { Button, Panel, Screen, Text, useState, type FunctionComponent, type JSX } from '@bedrock-core/ui-runtime';
import { Link, StackActions, CommonActions, createStackNavigator, createStaticNavigation, createTopTabNavigator, useLinkProps, useRoute } from '@bedrock-core/navigation';
import { createNavigatorFactory } from '@bedrock-core/navigation/runtime';
import { compileFormScreen } from '../hosts/form/compile';
import { eachControl } from '../__fixtures__/helpers';
import type { Control } from '../jsonui';
import type { NativePlan } from '../../../navigation/src/static/plan';

const node = (type: unknown, props: Record<string, unknown> = {}): JSX.Element => ({ type: type as FunctionComponent, props });
const text = (value: string) => node(Text, { children: value });
const link = (screen: string) => node(Link, { screen, width: 70, height: 20, children: text(screen) });
function app() {
  const A = () => Panel({ width: 200, height: 100, children: [text('Shared A body'), link('B'), link('C')] });
  const B = () => Panel({ width: 200, height: 100, children: [text('Shared B body'), link('C'), node(Link, { action: CommonActions.goBack(), children: text('Back') })] });
  const C = () => Panel({ width: 200, height: 100, children: [text('Shared C body'), link('A'), node(Button, { onPress: () => {}, children: text('Save') })] });
  const Navigation = createStaticNavigation(createStackNavigator({ screens: { A, B, C }, screenOptions: { headerShown: false } }), {
    clientNavigation: { maxDepth: 2, maxStates: 12 },
  });
  const App = () => Screen({ children: node(Navigation) });
  return compileFormScreen(App, { namespace: 'static_nav', name: 'stack', testMetadata: true });
}

describe('static navigation compilation', () => {
  it('composes public custom factories without losing nested route scope or the shared native plan', () => {
    const createFramedStack = createNavigatorFactory('stack', ({ route, children }) => Panel({
      width: '100%', height: '100%', children: [text(`Frame ${route.name}`), children],
    }));
    const Page = (): JSX.Element => Panel({ children: [text(`Page ${useRoute().name}`), link('B')] });
    const Custom = createFramedStack({ screens: { A: Page, B: Page }, screenOptions: { headerShown: false } });
    const Navigation = createStaticNavigation(createStackNavigator({
      screens: { Inner: Custom }, screenOptions: { headerShown: false },
    }), { clientNavigation: { maxDepth: 2, maxStates: 8 } });
    const compiled = compileFormScreen(() => Screen({ children: node(Navigation) }), { namespace: 'custom_nav', name: 'framed' });
    const plan = compiled.snapshot.data?.['navigation:root'] as NativePlan;
    const controls: Control[] = [];

    eachControl(compiled.document, (_name, control) => controls.push(control));
    for (const caption of ['Frame A', 'Frame B', 'Page A', 'Page B']) {
      expect(controls.filter(control => control.type === 'label' && control.text === caption)).toHaveLength(1);
    }
    expect(plan.bodies.filter(body => body.base).map(body => body.name)).toEqual(['A', 'B']);
    expect(plan.contexts.length).toBeGreaterThan(1);
    expect(plan.contexts.length).toBeLessThanOrEqual(8);
  });

  it('bounds native contexts and emits one body and one caption per page', () => {
    const compiled = app();
    const plan = compiled.snapshot.data?.['navigation:root'] as NativePlan;
    expect(plan.v).toBe(3);
    expect(plan.contexts.length).toBeLessThanOrEqual(12);
    expect(Object.values(plan.edges).length).toBeGreaterThan(3);
    const controls: Control[] = [];
    eachControl(compiled.document, (_name, control) => controls.push(control));
    for (const caption of ['Shared A body', 'Shared B body', 'Shared C body', 'Save']) {
      expect(controls.filter(control => control.type === 'label' && control.text === caption)).toHaveLength(1);
    }
    expect(controls.filter(control => control.type === 'toggle' && control.focus_enabled === false)).toHaveLength(plan.contexts.length);
    expect(compiled.entries.filter(entry => entry.role === 'button').length).toBeLessThan(50);
  });
  it('fills the initial route path before other entry routes when the state budget is small', () => {
    const Page = (next: string) => () => Panel({ children: link(next) });
    const Navigation = createStaticNavigation(createStackNavigator({
      screens: { A: Page('B'), B: Page('C'), C: Page('A'), Other: Page('A') },
      screenOptions: { headerShown: false },
    }), { clientNavigation: { maxDepth: 2, maxStates: 3 } });
    const compiled = compileFormScreen(() => Screen({ children: node(Navigation) }), { namespace: 'static_nav', name: 'priority' });
    const plan = compiled.snapshot.data?.['navigation:root'] as NativePlan;

    expect(plan.contexts).toHaveLength(3);
    expect(plan.contexts.map(context => context.checkpoint?.presses.length ?? 0)).toEqual([0, 1, 2]);
    expect(plan.bodies.find(body => body.id === plan.contexts[2].body)?.name).toBe('C');
  });

  it('uses carried membership for the server entry and native toggle state for local selection', () => {
    const compiled = app();
    const controls: Control[] = [];
    eachControl(compiled.document, (_name, control) => controls.push(control));
    const selectors = controls.filter(control => control.bindings?.some(binding => binding.target_property_name === '#selection_mask'));
    expect(selectors.length).toBeGreaterThan(3);
    for (const selector of selectors) {
      expect(selector.bindings?.some(binding => binding.source_property_name?.includes('#selection_mask'))).toBe(true);
      expect(selector.collection_index).toBeUndefined();
      expect(selector.property_bag?.['#selection_mask']).toMatch(/^m\|/);
    }
  });
  it('retains the runtime of a root whose initial route is a published reference', () => {
    const Navigation = createStaticNavigation(createStackNavigator({ screens: { Foreign: 'other:entry' } }));
    const compiled = compileFormScreen(() => Screen({ children: node(Navigation) }), { namespace: 'static_nav', name: 'initial_reference' });
    expect(compiled.table).toBeUndefined();
    expect(compiled.entries.some(entry => entry.carrier === 'bool')).toBe(true);
  });
  it('builds nested top tabs and a nested stack as one finite root', () => {
    const Page = () => Panel({ children: text('Page') });
    const Navigation = createStaticNavigation(createStackNavigator({ screens: {
      Home: createTopTabNavigator({ screens: { Shop: createStackNavigator({ screens: { Products: Page, Product: Page } }), Settings: Page } }),
      About: Page,
    } }));
    const compiled = compileFormScreen(() => Screen({ children: node(Navigation) }), { namespace: 'static_nav', name: 'tabs' });
    const plan = compiled.snapshot.data?.['navigation:root'] as NativePlan;
    expect(plan.bodies.filter(body => body.base).map(body => body.name)).toEqual(['Products', 'Product', 'Settings', 'About']);
    expect(plan.contexts.length).toBeLessThanOrEqual(128);
    expect(Object.keys(plan.edges).length).toBeGreaterThan(0);
  });
  it('keeps published routes on the server and rejects exhausted budgets in error mode', () => {
    const Page = () => Panel({ children: [link('B'), link('Catalog')] });
    const Root = createStackNavigator({ screens: { A: Page, B: Page, Catalog: 'economy:catalog' }, screenOptions: { headerShown: false } });
    const Navigation = createStaticNavigation(Root, { clientNavigation: { maxDepth: 0, fallback: 'server' } });
    const compiled = compileFormScreen(() => Screen({ children: node(Navigation) }), { namespace: 'static_nav', name: 'server' });
    const plan = compiled.snapshot.data?.['navigation:root'] as NativePlan;
    expect(plan.contexts).toHaveLength(1);
    expect(Object.values(plan.edges).every(index => index === 0)).toBe(true);
    expect(Object.keys(plan.edges).some(key => key.endsWith('/1'))).toBe(false);
    const Strict = createStaticNavigation(Root, { clientNavigation: { maxDepth: 0, fallback: 'error' } });
    expect(() => compileFormScreen(() => Screen({ children: node(Strict) }), { namespace: 'static_nav', name: 'strict' })).toThrow('budget');
  });
  it('recognizes a complete useLinkProps spread and leaves wrapped handlers on the server', () => {
    const Page = (): JSX.Element => {
      const props = useLinkProps({ action: StackActions.push('B') });
      return Panel({ children: [node(Button, { ...props, children: text('Direct') }), node(Button, {
        onPress: (event: Parameters<typeof props.onPress>[0]) => props.onPress(event), children: text('Wrapped'),
      })] });
    };
    const Navigation = createStaticNavigation(createStackNavigator({ screens: { A: Page, B: () => Panel({}) }, screenOptions: { headerShown: false } }));
    const compiled = compileFormScreen(() => Screen({ children: node(Navigation) }), { namespace: 'static_nav', name: 'links' });
    const plan = compiled.snapshot.data?.['navigation:root'] as NativePlan;
    expect(Object.keys(plan.edges).some(key => key.endsWith('/0'))).toBe(true);
    expect(Object.keys(plan.edges).some(key => key.endsWith('/1'))).toBe(false);
  });
  it('preserves semantic button identities and captions on native and server hitboxes', () => {
    const Page = () => Panel({ children: node(Link, { screen: 'B', testId: 'next', children: text('Next') }) });
    const Navigation = createStaticNavigation(createStackNavigator({ screens: { A: Page, B: () => Panel({}) }, screenOptions: { headerShown: false } }));
    const compiled = compileFormScreen(() => Screen({ children: node(Navigation) }), { namespace: 'static_nav', name: 'metadata', testMetadata: true });
    const controls = compiled.testMetadata!.controls.filter(control => control.testId === 'next');
    expect(new Set(controls.map(control => control.interaction))).toEqual(new Set(['local-toggle', 'form-button']));
    expect(controls.every(control => control.role === 'button' && control.name?.value === 'Next')).toBe(true);
    expect(controls.every(control => control.paths.length === 1)).toBe(true);
    expect(JSON.stringify(compiled.document)).not.toContain('__testCaption');
  });
  it('compiles stateful button faces and carried visibility inside contextual inputs', () => {
    const Page = () => {
      const [on, setOn] = useState(false);
      return Panel({ children: [node(Button, { liveVisible: true, background: on ? 'on_texture' : 'off_texture',
        onPress: () => setOn(!on), children: text('Change') }),
      node(Link, { screen: 'B', liveVisible: true, width: 80, height: 24, background: on ? 'on_texture' : 'off_texture' })] });
    };
    const Navigation = createStaticNavigation(createStackNavigator({ screens: { A: Page, B: () => Panel({}) }, screenOptions: { headerShown: false } }));
    const compiled = compileFormScreen(() => Screen({ children: node(Navigation) }), { namespace: 'static_nav', name: 'live_inputs' });
    expect(compiled.snapshot.looks?.length).toBeGreaterThan(0);
    expect(compiled.snapshot.vis.length).toBeGreaterThan(0);
    expect(JSON.stringify(compiled.document)).toContain('on_texture');
    expect(JSON.stringify(compiled.document)).toContain('off_texture');
    const radioScopes: boolean[] = [];
    const inspect = (control: Control, indexed = false): void => {
      const inCollection = indexed || control.collection_index !== undefined;
      if (control.type === 'toggle' && control.radio_toggle_group === true) { radioScopes.push(inCollection); }
      for (const entry of control.controls ?? []) {
        for (const child of Object.values(entry)) { inspect(child, inCollection); }
      }
    };
    for (const control of Object.values(compiled.document)) {
      if (typeof control !== 'string' && !('modifications' in control)) { inspect(control); }
    }
    expect(radioScopes.length).toBeGreaterThan(1);
    expect(radioScopes.every(indexed => !indexed)).toBe(true);
  });
  it('retains one page body per screen and a fixed context budget for 1,000 screens', () => {
    const screens = Object.fromEntries(Array.from({ length: 1000 }, (_, index) => [`Page${index}`, () => Panel({ children: [
      text(`Unique body ${index}`), link(`Page${(index + 1) % 1000}`),
    ] })]));
    const Navigation = createStaticNavigation(createStackNavigator({ screens, screenOptions: { headerShown: false } }));
    const compiled = compileFormScreen(() => Screen({ children: node(Navigation) }), { namespace: 'static_nav', name: 'large' });
    const plan = compiled.snapshot.data?.['navigation:root'] as NativePlan;
    expect(plan.bodies).toHaveLength(1000);
    expect(plan.contexts).toHaveLength(128);
    expect(plan.contexts.every(context => (context.checkpoint?.presses.length ?? 0) <= 5)).toBe(true);
    const controls: Control[] = [];
    eachControl(compiled.document, (_name, control) => controls.push(control));
    expect(controls.filter(control => control.type === 'label' && String(control.text).startsWith('Unique body '))).toHaveLength(1000);
    expect(compiled.entries.length).toBeLessThanOrEqual(2 * plan.bodies.length + 4 * plan.contexts.length);
  }, 60000);
});

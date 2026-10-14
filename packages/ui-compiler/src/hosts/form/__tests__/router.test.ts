import { formTitleFor } from '@bedrock-core/ui-runtime/compile';
import { describe, expect, it } from 'vitest';
import type { Control, Document, Modified } from '../../../jsonui';
import { formRouter, MOUNT_FILE, MOUNT_NAMESPACE, MOUNT_TARGET, type RoutedFormScreen } from '../router';

const screens = [
  { name: 'home', namespace: 'drav0011_shop_home', hasBackdrop: false },
  { name: 'basket', namespace: 'drav0011_shop_basket', hasBackdrop: true },
];

const control = (document: Record<string, unknown>, name: string): Control => document[name] as Control;

/** Follows the cell ids selected by the serialized title and marker dictionaries. */
const instantiate = (document: Document, addon: string, title: string, marker = ''): {
  screens: string[]; cursors: number; selectors: number;
} => {
  const result = { screens: [] as string[], cursors: 0, selectors: 0 };
  const reference = (name: string, override: Control = {}): void => {
    if (name.startsWith(document.namespace + '.')) {
      visit({ ...control(document, name.slice(document.namespace.length + 1)), ...override });
    } else if (name.endsWith('.screen')) {
      result.screens.push(name);
    } else if (name === 'core_ui_common.gamepad_cursor_button') {
      result.cursors++;
    }
  };
  const visit = (value: Control): void => {
    if (value.factory !== undefined) {
      result.selectors++;
      const expression = value.bindings?.find(binding => binding.target_property_name === '#collection_length')?.source_property_name;

      const property = expression?.match(/^\('#route_' \+ (#title_text|#marker)\)$/)?.[1];

      if (property === undefined) { throw new Error('A selector needs a title or marker dictionary lookup'); }

      const ids = value.property_bag?.[`#route_${property === '#marker' ? marker : title}`] ?? [];

      if (!Array.isArray(ids) || ids.length > 1) { throw new Error('A route must select at most one cell'); }

      for (const id of ids) {
        const cell = value.factory.control_ids?.[String(id)];

        if (cell === undefined) { throw new Error('A selected cell id must have a definition'); }

        reference(cell);
      }
    }

    for (const entry of value.controls ?? []) {
      for (const [name, child] of Object.entries(entry)) {
        const at = name.indexOf('@');

        if (at < 0) { visit(child); } else { reference(name.slice(at + 1), child); }
      }
    }
  };

  visit(control(document, `${addon}_forms`));

  return result;
};

const manyScreens = (count: number, embedded = false): RoutedFormScreen[] =>
  Array.from({ length: count }, (_, index) => {
    const name = `page${String(index).padStart(4, '0')}`;

    return { name, namespace: `addon_${name}`, hasBackdrop: true, ...embedded ? { marker: `core_addon:${name}` } : {} };
  });

describe('an addon\'s compiled form router', () => {
  const routing = formRouter(screens, 'drav0011_shop');

  it('creates a screen cell only for its complete title', () => {
    const gate = control(routing.router, 'drav0011_shop_title_selector');

    expect(gate).toMatchObject({
      type: 'collection_panel',
      factory: { control_ids: { home: 'drav0011_shop__forms.drav0011_shop_screen_home' } },
      property_bag: { '#route_corev0009core1:drav0011_shop_home': ['home'], '#route_': [] },
    });
    expect(gate.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: "('#route_' + #title_text)",
      target_property_name: '#collection_length',
      binding_condition: 'always',
    });
    expect(gate).not.toHaveProperty('controls');
    expect(gate).not.toHaveProperty('property_bag.#collection_length');
    expect(instantiate(routing.router, 'drav0011_shop', formTitleFor(screens[0]!.namespace)).screens)
      .toEqual(['drav0011_shop_home.screen']);
    expect(instantiate(routing.router, 'drav0011_shop', formTitleFor(screens[0]!.namespace) + '_other').screens).toEqual([]);
  });

  it('keeps backdrops and the cursor inside the selected cell', () => {
    const withBackdrop = control(routing.router, 'drav0011_shop_screen_basket').controls ?? [];
    const without = control(routing.router, 'drav0011_shop_screen_home').controls ?? [];

    expect(withBackdrop.map(entry => Object.keys(entry)[0])).toEqual([
      'backdrop@drav0011_shop_basket.backdrop', 'screen@drav0011_shop_basket.screen',
      'cursor@drav0011_shop__forms.drav0011_shop_cursor',
    ]);
    expect(without.map(entry => Object.keys(entry)[0])).toEqual([
      'screen@drav0011_shop_home.screen', 'cursor@drav0011_shop__forms.drav0011_shop_cursor',
    ]);
    expect(instantiate(routing.router, 'drav0011_shop', formTitleFor(screens[0]!.namespace)).cursors).toBe(1);
    expect(instantiate(routing.router, 'drav0011_shop', 'ordinary form').cursors).toBe(0);
    expect(JSON.stringify(routing.router).match(/@core_ui_common.gamepad_cursor_button/g)).toHaveLength(1);
    const embedded = formRouter(manyScreens(1, true), 'addon');

    expect(JSON.stringify(embedded.router)).not.toContain('gamepad_cursor');
  });

  it.each([25, 250, 1000])('selects every route in a %i-screen pack with one live selector', (count) => {
    const routes = manyScreens(count);
    const { router } = formRouter(routes, 'addon');

    for (const screen of routes) {
      const instance = instantiate(router, 'addon', formTitleFor(screen.namespace));

      expect(instance.screens).toEqual([`${screen.namespace}.screen`]);
      expect(instance.cursors).toBe(1);
      expect(instance.selectors).toBe(1);
    }
    expect(instantiate(router, 'addon', 'ordinary form')).toEqual({ screens: [], cursors: 0, selectors: 1 });
    expect(control(router, 'addon_forms').controls).toHaveLength(1);
    expect(Object.keys(control(router, 'addon_title_selector').factory!.control_ids!)).toHaveLength(count);
    expect(formRouter([...routes].reverse(), 'addon').router).toEqual(router);
  });

  it('handles a large character fanout and names that prefix other names', () => {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
    const routes = [...characters].flatMap(char => Array.from({ length: 20 }, (_, index) => ({
      name: `${char}${String(index).padStart(2, '0')}`, namespace: `addon_${char}${String(index).padStart(2, '0')}`, hasBackdrop: false,
    })));
    routes.push({ name: 'a', namespace: 'addon_a', hasBackdrop: false });
    const { router } = formRouter(routes, 'addon');

    for (const screen of routes) {
      expect(instantiate(router, 'addon', formTitleFor(screen.namespace)).screens).toEqual([`${screen.namespace}.screen`]);
    }
    expect(instantiate(router, 'addon', formTitleFor('addon_a_missing')).screens).toEqual([]);
  });

  it('selects embedded cells independently of the host title through one entry-zero reader', () => {
    const routes = manyScreens(1000, true);
    const { router } = formRouter([screens[0]!, ...routes], 'addon');

    for (const screen of routes) {
      const instance = instantiate(router, 'addon', formTitleFor(screens[0]!.namespace), screen.marker);

      expect(instance.screens).toEqual(['drav0011_shop_home.screen', `${screen.namespace}.screen`]);
      expect(instance.cursors).toBe(1);
      expect(instance.selectors).toBe(2);
    }
    expect(instantiate(router, 'addon', 'host', '').screens).toEqual([]);
    expect(instantiate(router, 'addon', 'host', 'core_addon:page0999_extra').screens).toEqual([]);
    for (const value of Object.values(router)) {
      if (typeof value !== 'object' || !('collection_name' in value) || value.collection_name !== 'form_buttons') { continue; }
      expect(value.controls?.[0]?.selector).toMatchObject({
        collection_index: 0, property_bag: { '#marker': '' },
        bindings: expect.arrayContaining([expect.objectContaining({ binding_name_override: '#marker', binding_condition: 'always' })]),
      });
    }
  });

  it('keeps addons with overlapping names independent', () => {
    const alpha = formRouter([{ name: 'home', namespace: 'alpha_home', hasBackdrop: false }], 'alpha');
    const beta = formRouter([{ name: 'home', namespace: 'alpha_home_other', hasBackdrop: false }], 'beta');
    const title = formTitleFor('alpha_home');

    expect(instantiate(alpha.router, 'alpha', title).screens).toEqual(['alpha_home.screen']);
    expect(instantiate(beta.router, 'beta', title).screens).toEqual([]);
    for (const name of Object.keys(routing.router)) { expect(name === 'namespace' || name.startsWith('drav0011_shop')).toBe(true); }
    expect(routing.routerFile).toBe('ui/core-ui/screens/drav0011_shop_forms.json');
  });

  it('inserts a local bridge into vanilla without replacing its controls or factory', () => {
    expect(routing.hook.file).toBe(MOUNT_FILE);
    expect(routing.hook.document.namespace).toBe(MOUNT_NAMESPACE);
    const target = routing.hook.document[MOUNT_TARGET] as Modified;

    expect(target.modifications).toContainEqual({
      array_name: 'controls', operation: 'insert_back', value: [{ 'drav0011_shop@drav0011_shop_compiled_form_bridge': {} }],
    });
    expect(target).not.toHaveProperty('controls');
    expect(target).not.toHaveProperty('type');
    expect(target).toMatchObject({ size: ['100%', '100%'] });
    expect(target).not.toHaveProperty('property_bag');
    const bridge = control(routing.hook.document, 'drav0011_shop_compiled_form_bridge');

    expect(bridge).not.toHaveProperty('controls');
    expect(bridge.factory).toEqual({
      name: 'server_form_factory',
      control_ids: {
        long_form: '@drav0011_shop__forms.drav0011_shop_forms',
        custom_form: '@drav0011_shop__forms.drav0011_shop_forms',
      },
    });
  });

  it('emits no selector for an empty addon and rejects ambiguous routes', () => {
    expect(control(formRouter([], 'addon').router, 'addon_forms').controls).toEqual([]);
    expect(() => formRouter([screens[0]!, screens[0]!], 'a')).toThrow(/Two screens are named/);
    expect(() => formRouter([screens[0]!, { ...screens[0]!, name: 'other' }], 'a')).toThrow(/Two screens use form title/);
    const embedded = manyScreens(1, true)[0]!;

    expect(() => formRouter([embedded, { ...embedded, name: 'other' }], 'a')).toThrow(/Two embedded screens use marker/);
  });
});

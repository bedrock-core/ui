import { describe, expect, it } from 'vitest';
import type { Control, Modified } from '../../../jsonui';
import { formRouter, MOUNT_FILE, MOUNT_NAMESPACE, MOUNT_TARGET } from '../router';

const screens = [
  { name: 'home', namespace: 'drav0011_shop_home', hasBackdrop: false },
  { name: 'basket', namespace: 'drav0011_shop_basket', hasBackdrop: true },
];

const control = (document: Record<string, unknown>, name: string): Control => document[name] as Control;

describe('an addon\'s compiled form router', () => {
  const routing = formRouter(screens, 'drav0011_shop');

  it('gives every screen a gate on its FULL title, so one name cannot prefix another', () => {
    expect(control(routing.router, 'drav0011_shop_gate_home').bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: "(#title_text = 'corev0009core1:drav0011_shop_home')",
      target_property_name: '#visible',
    });
  });

  it('starts every gate hidden, so a binding that fails shows nothing rather than everything', () => {
    expect(control(routing.router, 'drav0011_shop_gate_home').property_bag).toEqual({ '#visible': false });
  });

  it('mounts a screen\'s backdrop only when it has one', () => {
    const withBackdrop = control(routing.router, 'drav0011_shop_gate_basket').controls ?? [];
    const without = control(routing.router, 'drav0011_shop_gate_home').controls ?? [];

    expect(withBackdrop.map(entry => Object.keys(entry)[0])).toEqual([
      'backdrop@drav0011_shop_basket.backdrop',
      'screen@drav0011_shop_basket.screen',
    ]);
    expect(without.map(entry => Object.keys(entry)[0])).toEqual(['screen@drav0011_shop_home.screen']);
  });

  it('shares one cursor across standalone screens and omits it for embedded pages', () => {
    const root = control(routing.router, 'drav0011_shop_forms');
    const cursor = root.controls?.at(-1)?.cursor;
    expect(cursor?.controls).toEqual([{ 'pointer@core_ui_common.gamepad_cursor_button': {} }]);
    expect(cursor?.bindings).toContainEqual({
      binding_type: 'view',
      source_property_name: "((#title_text = 'corev0009core1:drav0011_shop_home') or (#title_text = 'corev0009core1:drav0011_shop_basket'))",
      target_property_name: '#visible',
    });
    expect(JSON.stringify(routing.router).match(/@core_ui_common.gamepad_cursor_button/g)).toHaveLength(1);
    const embedded = formRouter([{ name: 'page', namespace: 'addon_page', marker: 'page-marker', hasBackdrop: false }], 'addon');
    expect(JSON.stringify(embedded.router)).not.toContain('gamepad_cursor');
  });

  it('names every definition after the addon, so two addons never overwrite each other', () => {
    for (const name of Object.keys(routing.router)) {
      expect(name === 'namespace' || name.startsWith('drav0011_shop')).toBe(true);
    }

    expect(routing.routerFile).toBe('ui/core-ui/screens/drav0011_shop_forms.json');
  });

  it('inserts a local bridge into vanilla without replacing its controls or factory', () => {
    expect(routing.hook.file).toBe(MOUNT_FILE);
    expect(routing.hook.document.namespace).toBe(MOUNT_NAMESPACE);

    const target = routing.hook.document[MOUNT_TARGET] as Modified;

    expect(target.modifications).toContainEqual({
      array_name: 'controls',
      operation: 'insert_back',
      value: [{ 'drav0011_shop@drav0011_shop_compiled_form_bridge': {} }],
    });

    expect(target).not.toHaveProperty('controls');
    expect(target).not.toHaveProperty('type');
    expect(control(routing.hook.document, 'drav0011_shop_compiled_form_bridge').controls).toEqual([
      { 'root@drav0011_shop__forms.drav0011_shop_forms': {} },
    ]);
  });

  it('refuses two screens with the same name, which would share a title', () => {
    expect(() => formRouter([screens[0]!, screens[0]!], 'a')).toThrow(/Two screens are named/);
  });
});

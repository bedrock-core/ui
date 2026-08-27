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
      source_property_name: "(#title_text = 'bcuiv0008core1:drav0011_shop_home')",
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

  it('names every definition after the addon, so two addons never overwrite each other', () => {
    for (const name of Object.keys(routing.router)) {
      expect(name === 'namespace' || name.startsWith('drav0011_shop')).toBe(true);
    }

    expect(routing.routerFile).toBe('ui/core-ui/screens/drav0011_shop_forms.json');
  });

  it('hooks the mount by MODIFYING its path, defining nothing there', () => {
    expect(routing.hook.file).toBe(MOUNT_FILE);
    expect(routing.hook.document.namespace).toBe(MOUNT_NAMESPACE);

    const target = routing.hook.document[MOUNT_TARGET] as Modified;

    expect(target.modifications).toEqual([{
      array_name: 'controls',
      operation: 'insert_back',
      value: [{ 'drav0011_shop@core_ui_form.drav0011_shop_forms': {} }],
    }]);

    // A definition here would replace every other pack's copy instead of
    // joining it; only the one modification may be in this file.
    expect(Object.keys(routing.hook.document)).toEqual(['namespace', MOUNT_TARGET]);
  });

  it('refuses two screens with the same name, which would share a title', () => {
    expect(() => formRouter([screens[0]!, screens[0]!], 'a')).toThrow(/Two screens are named/);
  });
});

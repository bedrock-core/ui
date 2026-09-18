import { describe, expect, it } from 'vitest';
import {
  IDENTITY, layoutKey, LOOK_LIMIT, MAX_LAYOUT, namespaceOf, protocolItemDefinitions, protocolItemId,
} from '../contract';

describe('the layout key', () => {
  it('depends on nothing but the screen\'s full name', () => {
    expect(layoutKey('core', 'furnace')).toBe(layoutKey('core', 'furnace'));
    expect(layoutKey('core', 'furnace')).not.toBe(layoutKey('drav0011_shop', 'furnace'));
    expect(layoutKey('core', 'furnace')).not.toBe(layoutKey('core', 'crate'));
  });

  it('always fits the sentinel\'s current durability', () => {
    for (const [namespace, name] of [['core', 'a'], ['x', ''], ['', ''], ['drav0011_shop', 'crafting_table']]) {
      const key = layoutKey(namespace ?? '', name ?? '');

      expect(Number.isInteger(key)).toBe(true);
      expect(key).toBeGreaterThanOrEqual(1);
      expect(key).toBeLessThanOrEqual(MAX_LAYOUT);
    }

    expect(MAX_LAYOUT).toBe(IDENTITY.sentinel);
  });
});

describe('the protocol items', () => {
  it('have distinct identities within the signed 16-bit durability field', () => {
    const identities = Object.values(IDENTITY);

    expect(new Set(identities).size).toBe(identities.length);

    for (const identity of identities) {
      expect(Number.isInteger(identity)).toBe(true);
      expect(identity).toBeGreaterThan(0);
      expect(identity).toBeLessThanOrEqual(32767);
    }

    expect(LOOK_LIMIT).toBeLessThanOrEqual(Math.min(...identities) + 1);
  });

  it('are named per namespace, the same on every build', () => {
    expect(protocolItemId('core', 'transport')).toBe(protocolItemId('core', 'transport'));
    expect(protocolItemId('core', 'transport')).not.toBe(protocolItemId('core', 'guard'));
    expect(protocolItemId('core', 'transport')).not.toBe(protocolItemId('drav0011_shop', 'transport'));
    expect(protocolItemId('drav0011_shop', 'sentinel')).toMatch(/^drav0011_shop:core_[0-9a-z]+$/);
    expect(namespaceOf('drav0011_shop:counter')).toBe('drav0011_shop');
  });

  it('are defined invisible, hidden, and identified by their max durability', () => {
    const definitions = protocolItemDefinitions('core');

    expect(definitions.map(item => item.role)).toEqual(['sentinel', 'transport', 'guard', 'count']);

    for (const { role, identifier, document } of definitions) {
      const item = document['minecraft:item'] as {
        description: { identifier: string; menu_category: { category: string; is_hidden_in_commands: boolean } };
        components: Record<string, unknown>;
      };

      expect(item.description.identifier).toBe(identifier);
      expect(item.description.menu_category).toEqual({ category: 'none', is_hidden_in_commands: true });
      expect(item.components['minecraft:durability']).toEqual({ max_durability: IDENTITY[role] });
      expect(item.components['minecraft:max_stack_size']).toBe(role === 'sentinel' ? 1 : 64);
    }
  });
});

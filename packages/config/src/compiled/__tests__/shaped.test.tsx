import type { ConfigDefinition } from '@bedrock-core/server-runtime';
import { describe, expect, it } from 'vitest';
import { configScreens, leafName } from '../shaped';

/**
 * A schema with more of everything than the generic editor could draw: more
 * settings than its twelve rows, more options than its eight, and sections
 * nested under sections.
 */
const definition = {
  server: {
    economy: {
      currency: { type: 'string', default: 'coin', label: 'Currency' },
      startingBalance: { type: 'number', default: 100, min: 0, max: 1000, label: 'Starting balance' },
      taxRate: { type: 'number', default: 5, min: 0, max: 20, label: 'Tax rate' },
      mode: { type: 'enum', default: 'free', options: ['free', 'closed', 'auction', 'barter', 'gift', 'quest', 'raid', 'trade', 'wager'], label: 'Mode' },
      shop: {
        enabled: { type: 'boolean', default: true, label: 'Shop enabled' },
        slots: { type: 'number', default: 9, min: 1, max: 54, label: 'Slots' },
      },
    },
  },
  player: {
    nickname: { type: 'string', default: '', label: 'Nickname' },
  },
} as unknown as ConfigDefinition;

describe('screens shaped from a schema', () => {
  const screens = configScreens(definition);

  it('emits one per section that holds settings, per scope', () => {
    expect(Object.keys(screens).sort()).toEqual([
      leafName('player', ''),
      leafName('server', 'economy'),
      leafName('server', 'economy.shop'),
    ].sort());
  });

  it('names a section by its path, so two scopes never collide', () => {
    expect(leafName('server', 'economy.shop')).toBe('config_server_economy_shop');
    expect(leafName('player', '')).toBe('config_player');
  });

  it('leaves a section that only holds sub-sections to the navigation screens', () => {
    // `server` itself holds nothing but `economy`, so nothing is baked for it.
    expect(screens[leafName('server', '')]).toBeUndefined();
  });

  it('is a component per section, whatever the section holds', () => {
    for (const screen of Object.values(screens)) {
      expect(typeof screen).toBe('function');
    }
  });
});

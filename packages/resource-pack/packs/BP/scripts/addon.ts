/**
 * What this addon says about itself, in one place.
 *
 * `core.register()` takes this and the addon is online; the same declaration is
 * what its build reads, so the bedrock-core screens it is served — a config
 * screen per section of the schema below, shaped for the settings that section
 * has — follow from declaring and are wired up nowhere.
 *
 * The schema is sized to what a screen serving any schema could not draw: a
 * section past twelve rows, an enum past eight options, and a sub-section under
 * a section.
 */
import type { ConfigDefinition } from '@bedrock-core/server-runtime';

export const manifest = {
  creator: 'bedrock_core',
  pack: 'ui',
  packName: '@bedrock-core/ui reference',
  version: '1.0.1',
} as const;

export const config = {
  server: {
    economy: {
      currency: { type: 'string', default: 'coin', label: 'Currency' },
      startingBalance: { type: 'number', default: 100, min: 0, max: 1000, label: 'Starting balance' },
      taxRate: { type: 'number', default: 5, min: 0, max: 20, step: 1, label: 'Tax rate' },
      interest: { type: 'number', default: 2, min: 0, max: 10, step: 1, label: 'Interest' },
      mode: {
        type: 'enum',
        default: 'free',
        options: ['free', 'closed', 'auction', 'barter', 'gift', 'quest', 'raid', 'trade', 'wager'],
        label: 'Market mode',
      },
      allowTrading: { type: 'boolean', default: true, label: 'Allow trading' },
      allowLoans: { type: 'boolean', default: false, label: 'Allow loans' },
      announceSales: { type: 'boolean', default: true, label: 'Announce sales' },
      logTransactions: { type: 'boolean', default: true, label: 'Log transactions' },
      dailyBonus: { type: 'number', default: 10, min: 0, max: 100, step: 5, label: 'Daily bonus' },
      bonusStreak: { type: 'number', default: 7, min: 1, max: 30, label: 'Bonus streak' },
      motd: { type: 'string', default: 'Welcome to the market', label: 'Market message' },
      shopName: { type: 'string', default: 'The Exchange', label: 'Shop name' },
      currencySymbol: { type: 'string', default: '¤', label: 'Currency symbol' },
      shop: {
        enabled: { type: 'boolean', default: true, label: 'Shop enabled' },
        slots: { type: 'number', default: 9, min: 1, max: 54, label: 'Slots' },
        restockHours: { type: 'number', default: 6, min: 1, max: 24, label: 'Restock hours' },
      },
    },
  },
  player: {
    nickname: { type: 'string', default: '', label: 'Nickname' },
    showBalance: { type: 'boolean', default: true, label: 'Show balance' },
  },
} as ConfigDefinition;

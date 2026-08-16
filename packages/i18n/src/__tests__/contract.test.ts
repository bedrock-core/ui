/**
 * The interpolation contract with the i18n Regolith filter. The filter
 * converts {{var}} templates to positional %N$s when writing .lang files; the
 * runtime performs the identical conversion lazily in `resolve()` — one
 * template per lookup, no tables materialized anywhere. Both test suites pin
 * the SAME table — regolith-filters/i18n/test/contract.test.js carries the
 * counterpart — so a drift on either side fails a build instead of landing
 * arguments in wrong placeholders.
 */
import { describe, expect, it } from 'vitest';

import { createI18n } from '../createI18n';
import { toPositional } from '../interpolate';
import { bundle } from './fixture';

export const INTERPOLATION_CONTRACT = [
  { template: 'You bought {{item}} for {{price}} emeralds.', order: ['item', 'price'], positional: 'You bought %1$s for %2$s emeralds.' },
  { template: 'Por {{price}} esmeraldas compraste {{item}}.', order: ['item', 'price'], positional: 'Por %2$s esmeraldas compraste %1$s.' },
  { template: '{{ count }} left in stock', order: ['count'], positional: '%1$s left in stock' },
  { template: 'Version: {{version}}', order: ['version'], positional: 'Version: %1$s' },
  { template: 'No variables here.', order: [], positional: 'No variables here.' },
  { template: '{{a}}{{b}}{{a}}', order: ['a', 'b'], positional: '%1$s%2$s%1$s' },
] as const;

describe('interpolation contract', () => {
  for (const { template, order, positional } of INTERPOLATION_CONTRACT) {
    it(`"${template}" → "${positional}"`, () => {
      expect(toPositional(template, order)).toBe(positional);
    });
  }
});

describe('resolve() — the lazy measurement lookup', () => {
  const i18n = createI18n(bundle, { asDefault: false });

  it('resolves own keys in the .lang positional form, per locale', () => {
    expect(i18n.resolve('drav0011_economy.shop.bought')).toBe('You bought %1$s for %2$s emeralds.');
    expect(i18n.resolve('drav0011_economy.shop.stock_one')).toBe('%1$s left in stock');
    expect(i18n.forLocale('es_ES').resolve('drav0011_economy.shop.bought'))
      .toBe('Por %2$s esmeraldas compraste %1$s.');
  });

  it('resolves library keys as-is and vanilla keys under their branch', () => {
    expect(i18n.resolve('core.addons.title')).toBe('Mods');
    expect(i18n.resolve('core.addons.version')).toBe('Version: %1$s');
    expect(i18n.resolve('item.apple.name')).toBe('Apple');
    expect(i18n.forLocale('es_ES').resolve('item.apple.name')).toBe('Manzana');
  });

  it('falls back to the default locale per key for partial locales', () => {
    expect(i18n.forLocale('cs_CZ').resolve('drav0011_economy.shop.title')).toBe('Shop');
  });

  it('reads the .lang passthrough underneath, path-derived entries winning', () => {
    const withExtra = createI18n({
      ...bundle,
      extra: {
        en_US: {
          'bcg.demo.intro': 'Guide prose',
          'drav0011_economy.shop.title': 'Hand-written, must lose',
        },
      },
    }, { asDefault: false });

    expect(withExtra.resolve('bcg.demo.intro')).toBe('Guide prose');
    expect(withExtra.resolve('drav0011_economy.shop.title')).toBe('Shop');
  });

  it('returns undefined for keys this bundle does not carry', () => {
    expect(i18n.resolve('some_other_addon.thing')).toBeUndefined();
    expect(i18n.resolve('shop.title')).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';

import { createI18n, LOCALE_PROPERTY } from '../createI18n';
import { bundle, fakePlayer } from './fixture';

const i18n = createI18n(bundle);

describe('t()', () => {
  it('resolves and interpolates via selector', () => {
    expect(i18n.t($ => $.shop.bought, { item: 'Apple', price: 5 }))
      .toBe('You bought Apple for 5 emeralds.');
  });

  it('resolves the identical dot-string form', () => {
    expect(i18n.t('shop.bought', { item: 'Apple', price: 5 }))
      .toBe('You bought Apple for 5 emeralds.');
  });

  it('lets a locale reorder text while arguments stay put', () => {
    expect(i18n.forLocale('es_ES').t($ => $.shop.bought, { item: 'Apple', price: 5 }))
      .toBe('Por 5 esmeraldas compraste Apple.');
  });

  it('resolves library and vanilla branches', () => {
    expect(i18n.t($ => $.core.addons.title)).toBe('Mods');
    expect(i18n.forLocale('es_ES').t($ => $.core.addons.title)).toBe('Addons');
    expect(i18n.t($ => $.vanilla.item.apple.name)).toBe('Apple');
    expect(i18n.forLocale('es_ES').t($ => $.vanilla.item.apple.name)).toBe('Manzana');
  });

  it('returns the real key when nothing resolves, mirroring the client', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deliberately unknown path
    expect((i18n.t as any)('shop.nope')).toBe('drav0011_economy.shop.nope');
  });

  it('falls back to the default locale per key for partial locales', () => {
    expect(i18n.forLocale('cs_CZ').t($ => $.shop.title)).toBe('Shop');
  });
});

describe('plurals', () => {
  it('selects one/other in English', () => {
    expect(i18n.t($ => $.shop.stock, { count: 1 })).toBe('1 left in stock');
    expect(i18n.t($ => $.shop.stock, { count: 3 })).toBe('3 left in stock');
  });

  it('selects few in Czech, falling back to other past four', () => {
    const cs = i18n.forLocale('cs_CZ');
    expect(cs.t($ => $.shop.stock, { count: 1 })).toBe('Zbývá 1 kus');
    expect(cs.t($ => $.shop.stock, { count: 2 })).toBe('Zbývají 2 kusy');
    expect(cs.t($ => $.shop.stock, { count: 7 })).toBe('Zbývá 7 kusů');
  });
});

describe('key()', () => {
  it('prefixes own keys with the addon namespace', () => {
    expect(i18n.key($ => $.shop.title)).toBe('drav0011_economy.shop.title');
  });

  it('keeps library keys and strips the vanilla branch', () => {
    expect(i18n.key($ => $.core.addons.title)).toBe('core.addons.title');
    expect(i18n.key($ => $.vanilla.item.apple.name)).toBe('item.apple.name');
  });

  it('appends the plural suffix the count selects', () => {
    expect(i18n.key($ => $.shop.stock, { count: 1 })).toBe('drav0011_economy.shop.stock_one');
    expect(i18n.key($ => $.shop.stock, { count: 9 })).toBe('drav0011_economy.shop.stock_other');
  });
});

describe('raw()', () => {
  it('builds with in the recorded argument order', () => {
    expect(i18n.raw($ => $.shop.bought, { item: 'Apple', price: 5 }))
      .toEqual({ translate: 'drav0011_economy.shop.bought', with: ['Apple', '5'] });
  });

  it('omits with when the key takes no arguments', () => {
    expect(i18n.raw($ => $.shop.title)).toEqual({ translate: 'drav0011_economy.shop.title' });
  });

  it('passes positional arrays through for vanilla keys', () => {
    expect(i18n.raw($ => $.vanilla.item.apple.name, ['x']))
      .toEqual({ translate: 'item.apple.name', with: ['x'] });
  });

  it('keeps count in with for locale-only plural variants', () => {
    expect(i18n.forLocale('cs_CZ').raw($ => $.shop.stock, { count: 2 }))
      .toEqual({ translate: 'drav0011_economy.shop.stock_few', with: ['2'] });
  });

  it('borrows the _other argument order when a hand-built bundle omits variant args', () => {
    const { 'shop.stock_few': _dropped, ...args } = bundle.args;
    const handBuilt = createI18n({ ...bundle, args }, { asDefault: false });
    expect(handBuilt.forLocale('cs_CZ').raw($ => $.shop.stock, { count: 2 }))
      .toEqual({ translate: 'drav0011_economy.shop.stock_few', with: ['2'] });
  });

  it('switches to rawtext parameters when an argument is itself a translate', () => {
    expect(i18n.raw($ => $.shop.bought, { item: i18n.raw($ => $.vanilla.item.apple.name), price: 5 }))
      .toEqual({
        translate: 'drav0011_economy.shop.bought',
        with: { rawtext: [{ translate: 'item.apple.name' }, { text: '5' }] },
      });
  });
});

describe('locale resolution', () => {
  it('uses the client locale when authored', () => {
    expect(i18n.forPlayer(fakePlayer({ locale: 'es_ES' })).locale).toBe('es_ES');
  });

  it('falls back to the default locale for unauthored client locales', () => {
    expect(i18n.forPlayer(fakePlayer({ locale: 'fr_FR' })).locale).toBe('en_US');
  });

  it('lets a persisted override win over the client locale', () => {
    expect(i18n.forPlayer(fakePlayer({ locale: 'en_US', override: 'es_ES' })).locale).toBe('es_ES');
  });

  it('ignores an override pointing at an unauthored locale', () => {
    expect(i18n.forPlayer(fakePlayer({ locale: 'es_ES', override: 'fr_FR' })).locale).toBe('es_ES');
  });

  it('setLocale persists and clearLocale removes the override', () => {
    const player = fakePlayer({ locale: 'en_US' });
    i18n.setLocale(player, 'es_ES');
    expect(player.properties.get(LOCALE_PROPERTY)).toBe('es_ES');
    expect(i18n.forPlayer(player).locale).toBe('es_ES');
    i18n.clearLocale(player);
    expect(player.properties.has(LOCALE_PROPERTY)).toBe(false);
    expect(i18n.forPlayer(player).locale).toBe('en_US');
  });

  it('top-level verbs are bound to the default locale', () => {
    expect(i18n.locale).toBe('en_US');
  });
});

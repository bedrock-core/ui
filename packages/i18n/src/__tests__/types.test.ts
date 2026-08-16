/**
 * Compile-time behavior. `yarn build` (tsc, noEmit) is the real assertion
 * layer here: every @ts-expect-error line fails the build if the type
 * machinery stops rejecting it. The runtime expectations just keep vitest
 * happy and prove the loosely-typed calls still behave.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import { createI18n } from '../createI18n';
import type { RawMessage } from '@minecraft/server';
import { bundle } from './fixture';

const i18n = createI18n(bundle);

describe('type machinery', () => {
  it('selector and string forms type-check symmetrically', () => {
    expectTypeOf(i18n.t($ => $.shop.title)).toEqualTypeOf<string>();
    expectTypeOf(i18n.t('shop.title')).toEqualTypeOf<string>();
    expectTypeOf(i18n.raw($ => $.shop.title)).toEqualTypeOf<RawMessage>();

    // @ts-expect-error — unknown selector path
    void (($: Parameters<typeof i18n.t>[0]) => $)($ => $.shop.nope);
    // @ts-expect-error — unknown string path
    expect(i18n.t('shop.nope')).toBe('drav0011_economy.shop.nope');
  });

  it('interpolation variables are required and closed', () => {
    expect(i18n.t($ => $.shop.bought, { item: 'Apple', price: 5 })).toContain('Apple');

    // @ts-expect-error — arguments are required when the template has variables
    void i18n.t($ => $.shop.bought);
    // @ts-expect-error — missing variable: price
    void i18n.t($ => $.shop.bought, { item: 'Apple' });
    // @ts-expect-error — unknown variable: cost
    void i18n.t($ => $.shop.bought, { item: 'Apple', price: 5, cost: 1 });
    // @ts-expect-error — no arguments allowed on a variable-free template
    void i18n.t($ => $.shop.title, { item: 'x' });
  });

  it('plural groups collapse to one leaf demanding count', () => {
    expect(i18n.t($ => $.shop.stock, { count: 2 })).toBe('2 left in stock');
    expect(i18n.t('shop.stock', { count: 2 })).toBe('2 left in stock');

    // @ts-expect-error — count is required on a plural leaf
    void i18n.t($ => $.shop.stock, {});
    // @ts-expect-error — count must be a number
    void i18n.t($ => $.shop.stock, { count: 'two' });
    // @ts-expect-error — suffixed variants are hidden behind the collapsed leaf
    void i18n.t($ => $.shop.stock_one, { count: 1 });
  });

  it('library and vanilla branches participate', () => {
    expect(i18n.t($ => $.core.addons.version, { version: '1.0.0' })).toBe('Version: 1.0.0');
    // Vanilla leaves are non-literal: optional loose arguments only.
    expect(i18n.t($ => $.vanilla.item.apple.name)).toBe('Apple');
    expect(i18n.t('vanilla.item.apple.name')).toBe('Apple');

    // @ts-expect-error — missing variable: version
    void i18n.t($ => $.core.addons.version, {});
  });
});

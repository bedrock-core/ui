/**
 * A bundle mirroring what the i18n Regolith filter generates for the e2e
 * fixture addon: own keys, a `core` library branch (with an en_US-only
 * override — "Mods"), a referenced vanilla key, and a Czech partial with a
 * `few` plural. `resources` is typed the way the generated declaration types
 * it, so the type tests exercise the same shapes real projects see.
 */
import type { Player } from '@minecraft/server';
import type { I18nBundle } from '../bundle';

const en_US = {
  shop: {
    title: 'Shop',
    bought: 'You bought {{item}} for {{price}} emeralds.',
    stock_one: '{{count}} left in stock',
    stock_other: '{{count}} left in stock',
  },
} as const;

export type Resources = typeof en_US & {
  readonly core: {
    readonly addons: {
      readonly title: 'Addons';
      readonly version: 'Version: {{version}}';
    };
  };
  readonly vanilla: {
    readonly item: {
      readonly apple: { readonly name: string };
    };
  };
};

export const bundle: I18nBundle & { readonly resources?: Resources } = {
  namespace: 'drav0011_economy',
  defaultLocale: 'en_US',
  libs: ['core'],
  args: {
    'core.addons.version': ['version'],
    'shop.bought': ['item', 'price'],
    'shop.stock_one': ['count'],
    'shop.stock_other': ['count'],
  },
  locales: {
    en_US: {
      'core.addons.title': 'Mods',
      'core.addons.version': 'Version: {{version}}',
      'shop.bought': 'You bought {{item}} for {{price}} emeralds.',
      'shop.stock_one': '{{count}} left in stock',
      'shop.stock_other': '{{count}} left in stock',
      'shop.title': 'Shop',
      'vanilla.item.apple.name': 'Apple',
    },
    es_ES: {
      'core.addons.title': 'Addons',
      'core.addons.version': 'Version: {{version}}',
      'shop.bought': 'Por {{price}} esmeraldas compraste {{item}}.',
      'shop.stock_one': 'Queda {{count}} en stock',
      'shop.stock_other': 'Quedan {{count}} en stock',
      'shop.title': 'Tienda',
      'vanilla.item.apple.name': 'Manzana',
    },
    cs_CZ: {
      'shop.stock_one': 'Zbývá {{count}} kus',
      'shop.stock_few': 'Zbývají {{count}} kusy',
      'shop.stock_other': 'Zbývá {{count}} kusů',
    },
  },
};

/** A minimal Player test double — the engine reads locale + dynamic properties only. */
export type FakePlayer = Player & { readonly properties: Map<string, string> };

export function fakePlayer(options: { locale?: string, override?: string } = {}): FakePlayer {
  const properties = new Map<string, string>();

  if (options.override !== undefined) { properties.set('bedrock_core:i18n_locale', options.override); }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- minimal Player stub; only locale + dynamic properties are touched
  return {
    clientSystemInfo: { locale: options.locale },
    properties,
    getDynamicProperty: (id: string) => properties.get(id),
    setDynamicProperty: (id: string, value?: string) => {
      if (value === undefined) { properties.delete(id); }
      else { properties.set(id, value); }
    },
  } as unknown as FakePlayer;
}

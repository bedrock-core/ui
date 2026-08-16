import { describe, expect, it } from 'vitest';

import { createI18n } from '../createI18n';
import { pickLocale } from '../locale';
import { createResourceBundle } from '../resources';
import { bundle, fakePlayer } from './fixture';

describe('pickLocale', () => {
  const available = ['en_US', 'es_ES', 'pt_BR'];

  it('prefers an exact match', () => {
    expect(pickLocale(available, ['es_ES'], 'en_US')).toBe('es_ES');
  });

  it('falls back to a sibling region of the same language before the default', () => {
    expect(pickLocale(available, ['es_MX'], 'en_US')).toBe('es_ES');
    expect(pickLocale(available, ['pt_PT'], 'en_US')).toBe('pt_BR');
  });

  it('walks candidates in order', () => {
    expect(pickLocale(available, [undefined, 'fr_FR', 'es_ES'], 'en_US')).toBe('es_ES');
  });

  it('falls back to the default locale, then to anything', () => {
    expect(pickLocale(available, ['ja_JP'], 'en_US')).toBe('en_US');
    expect(pickLocale(['de_DE'], ['ja_JP'], 'en_US')).toBe('de_DE');
    expect(pickLocale([], ['ja_JP'], 'en_US')).toBeUndefined();
  });
});

describe('sibling-region resolution inside the engine', () => {
  it('binds es_MX players to es_ES rather than the default', () => {
    expect(createI18n(bundle).forPlayer(fakePlayer({ locale: 'es_MX' })).locale).toBe('es_ES');
  });
});

describe('createResourceBundle', () => {
  const libBundle = createResourceBundle('core', {
    en_US: { addons: { title: 'Addons', version: 'Version: {{version}}' } },
    es_ES: { addons: { title: 'Addons', version: 'Versión: {{version}}' } },
  });
  const lib = createI18n(libBundle);

  it('flattens, records argument order, and namespaces real keys', () => {
    expect(libBundle.locales['en_US']).toEqual({
      'addons.title': 'Addons',
      'addons.version': 'Version: {{version}}',
    });
    expect(libBundle.args).toEqual({ 'addons.version': ['version'] });
    expect(lib.key($ => $.addons.title)).toBe('core.addons.title');
  });

  it('drives fully typed verbs without any filter involved', () => {
    expect(lib.t($ => $.addons.version, { version: '1.0' })).toBe('Version: 1.0');
    expect(lib.forLocale('es_ES').t($ => $.addons.version, { version: '1.0' })).toBe('Versión: 1.0');
    expect(lib.raw($ => $.addons.version, { version: '1.0' }))
      .toEqual({ translate: 'core.addons.version', with: ['1.0'] });
  });
});

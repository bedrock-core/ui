import { describe, expect, it } from 'vitest';

import { pluralCategory } from '../plural';

describe('pluralCategory', () => {
  it('en/de/es family: one at exactly 1', () => {
    expect(pluralCategory('en_US', 1)).toBe('one');
    expect(pluralCategory('de_DE', 0)).toBe('other');
    expect(pluralCategory('es_ES', 2)).toBe('other');
    expect(pluralCategory('en_US', 1.5)).toBe('other');
  });

  it('fr: 0 and 1 are one', () => {
    expect(pluralCategory('fr_FR', 0)).toBe('one');
    expect(pluralCategory('fr_FR', 1)).toBe('one');
    expect(pluralCategory('fr_FR', 2)).toBe('other');
  });

  it('ja/ko/zh/id: no distinction', () => {
    expect(pluralCategory('ja_JP', 1)).toBe('other');
    expect(pluralCategory('zh_CN', 1)).toBe('other');
  });

  it('cs/sk: few between 2 and 4', () => {
    expect(pluralCategory('cs_CZ', 1)).toBe('one');
    expect(pluralCategory('cs_CZ', 3)).toBe('few');
    expect(pluralCategory('sk_SK', 5)).toBe('other');
  });

  it('pl: few by tens digit, many otherwise', () => {
    expect(pluralCategory('pl_PL', 1)).toBe('one');
    expect(pluralCategory('pl_PL', 3)).toBe('few');
    expect(pluralCategory('pl_PL', 13)).toBe('many');
    expect(pluralCategory('pl_PL', 22)).toBe('few');
    expect(pluralCategory('pl_PL', 5)).toBe('many');
  });

  it('ru/uk: one at …1 except …11, few at …2-4 except …12-14, else many', () => {
    expect(pluralCategory('ru_RU', 1)).toBe('one');
    expect(pluralCategory('ru_RU', 21)).toBe('one');
    expect(pluralCategory('ru_RU', 11)).toBe('many');
    expect(pluralCategory('uk_UA', 3)).toBe('few');
    expect(pluralCategory('ru_RU', 14)).toBe('many');
    expect(pluralCategory('ru_RU', 25)).toBe('many');
  });

  it('negative counts categorize by magnitude', () => {
    expect(pluralCategory('en_US', -1)).toBe('one');
  });
});

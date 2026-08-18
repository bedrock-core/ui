/**
 * The pure shaping layer: a flat replicated schema in, the tree a screen renders out.
 *
 * These matter more than they look. `buildSectionTree` is what decides how deep a config
 * screen can go and whether a level renders as buttons or as a form, and it works on data
 * that crossed a transport — so the fixtures here are shaped the way the runtime actually
 * emits them (flat, dot-pathed, depth-first in declaration order), not the way an addon
 * authors them.
 */
import { describe, expect, it } from 'vitest';
import {
  buildSectionTree,
  filterScopeGroups,
  findSection,
  formEntries,
  isFormField,
  isPureSection,
  listEntries,
} from '../schema';
import type { EntrySchema, FlatGroupsLike, FlatSchemaLike } from '../../types';

const bool = (label: string): EntrySchema => ({ type: 'boolean', label, default: true });
const list = (label: string): EntrySchema => ({ type: 'list', itemType: 'string', label, default: '[]' });
const multi = (label: string): EntrySchema =>
  ({ type: 'multiselect', label, default: '[]', options: ['a', 'b'] });

/** economy.pricing.taxRate, economy.currency, general.greeting — three levels, mixed. */
const SCHEMA: FlatSchemaLike = {
  'economy.pricing.taxRate': bool('Tax Rate'),
  'economy.currency': bool('Currency'),
  'general.greeting': bool('Greeting'),
};

const GROUPS: FlatGroupsLike = {
  economy: { label: 'Economy', description: 'Money and prices' },
  'economy.pricing': { label: 'Pricing' },
};

describe('buildSectionTree', () => {
  it('splits on every dot, not just the first', () => {
    const root = buildSectionTree(SCHEMA, GROUPS);
    const economy = root.children.find(c => c.path === 'economy')!;

    expect(root.children.map(c => c.path)).toEqual(['economy', 'general']);
    expect(economy.children.map(c => c.path)).toEqual(['economy.pricing']);
    // The leaf lands on the section that owns it, keyed by its FULL path.
    expect(economy.children[0].entries.map(([k]) => k)).toEqual(['economy.pricing.taxRate']);
    expect(economy.entries.map(([k]) => k)).toEqual(['economy.currency']);
  });

  it('takes label and description from the group map', () => {
    const economy = buildSectionTree(SCHEMA, GROUPS).children[0];

    expect(economy.label).toBe('Economy');
    expect(economy.description).toBe('Money and prices');
    expect(economy.children[0].label).toBe('Pricing');
    expect(economy.children[0].description).toBeUndefined();
  });

  it('derives a title from the key when the group declares none', () => {
    const root = buildSectionTree(SCHEMA, GROUPS);

    expect(root.children.find(c => c.path === 'general')!.label).toBe('General');
  });

  it('works with no group map at all — an addon on an older runtime', () => {
    const root = buildSectionTree(SCHEMA);

    expect(root.children.map(c => c.label)).toEqual(['Economy', 'General']);
    expect(root.children[0].description).toBeUndefined();
  });

  it('keeps declaration order rather than sorting', () => {
    const root = buildSectionTree({ zulu: bool('Z'), alpha: bool('A') });

    expect(root.entries.map(([k]) => k)).toEqual(['zulu', 'alpha']);
  });

  it('puts un-nested keys on the root section', () => {
    const root = buildSectionTree({ showTips: bool('Show Tips') });

    expect(root.entries.map(([k]) => k)).toEqual(['showTips']);
    expect(root.children).toEqual([]);
  });

  it('is empty for an empty schema', () => {
    const root = buildSectionTree({});

    expect(root.entries).toEqual([]);
    expect(root.children).toEqual([]);
  });
});

describe('isPureSection', () => {
  it('is true only when a level holds sections and no settings of its own', () => {
    // Every top-level key nests — the level has nothing to put in a form.
    const pure = buildSectionTree({ 'a.one': bool('One'), 'b.two': bool('Two') });

    expect(isPureSection(pure)).toBe(true);
    expect(isPureSection(pure.children[0])).toBe(false);
  });

  it('is false when even one setting sits alongside the sections', () => {
    const mixed = buildSectionTree({ 'a.one': bool('One'), loose: bool('Loose') });

    expect(isPureSection(mixed)).toBe(false);
  });

  it('is false for a leaf-only level — there is nothing to navigate to', () => {
    expect(isPureSection(buildSectionTree({ only: bool('Only') }))).toBe(false);
  });
});

describe('findSection', () => {
  const root = buildSectionTree(SCHEMA, GROUPS);

  it('re-locates a section by dot-path at any depth', () => {
    expect(findSection(root, '')).toBe(root);
    expect(findSection(root, 'economy')!.label).toBe('Economy');
    expect(findSection(root, 'economy.pricing')!.label).toBe('Pricing');
  });

  it('returns undefined for a path the schema no longer has', () => {
    expect(findSection(root, 'economy.gone')).toBeUndefined();
    expect(findSection(root, 'nope')).toBeUndefined();
  });
});

describe('filterScopeGroups', () => {
  it('strips the scope prefix and drops the other scopes', () => {
    const scoped: FlatGroupsLike = {
      'server.economy': { label: 'Economy' },
      'player.prefs': { label: 'Preferences' },
    };

    expect(filterScopeGroups(scoped, 'server')).toEqual({ economy: { label: 'Economy' } });
    expect(filterScopeGroups(scoped, 'dimension')).toEqual({});
  });
});

/**
 * The whole point of the tree, exercised on the shape a real schema flattens to: a scope that is
 * pure structure at the top, a section that is pure structure one level down, and a section that
 * holds settings at the bottom. This is what decides how many button screens a player walks
 * through before a form opens.
 */
describe('a three-level schema, as the runtime flattens it', () => {
  const schema: FlatSchemaLike = {
    'economy.pricing.taxRate': bool('Tax Rate'),
    'economy.pricing.rounding': bool('Rounding'),
    'economy.payouts.daily': bool('Daily Payout'),
    'moderation.chat.filter': bool('Filter'),
  };
  const groups: FlatGroupsLike = {
    economy: { label: 'Economy', description: 'Money, prices and tax.' },
    'economy.pricing': { label: 'Pricing', description: 'What things cost.' },
    'economy.payouts': { label: 'Payouts' },
    moderation: { label: 'Moderation' },
    'moderation.chat': { label: 'Chat' },
  };
  const root = buildSectionTree(schema, groups);

  it('makes every level above the settings a button screen', () => {
    expect(isPureSection(root)).toBe(true);
    expect(isPureSection(findSection(root, 'economy')!)).toBe(true);
    expect(isPureSection(findSection(root, 'moderation')!)).toBe(true);
  });

  it('stops at the level that owns settings — that one is the form', () => {
    expect(isPureSection(findSection(root, 'economy.pricing')!)).toBe(false);
    expect(isPureSection(findSection(root, 'economy.payouts')!)).toBe(false);
    expect(isPureSection(findSection(root, 'moderation.chat')!)).toBe(false);
  });

  it('carries each section its own strings, at every depth', () => {
    expect(findSection(root, 'economy')!.description).toBe('Money, prices and tax.');
    expect(findSection(root, 'economy.pricing')!.description).toBe('What things cost.');
    expect(findSection(root, 'economy.payouts')!.description).toBeUndefined();
  });

  it('keeps both settings of a section together, in declared order', () => {
    expect(findSection(root, 'economy.pricing')!.entries.map(([k]) => k))
      .toEqual(['economy.pricing.taxRate', 'economy.pricing.rounding']);
  });
});

/**
 * Lists are the reason buttons-vs-form is not simply "does this level have entries".
 *
 * A list has no native modal control, so it never needed the form — stranding it on one is what
 * forced the old read-only fallback. `multiselect` looks similar (its value is an array too) but
 * IS a form field: its options are fixed and known, so the modal draws one checkbox per option.
 */
describe('lists vs form fields', () => {
  it('counts everything except a list as a form field', () => {
    expect(isFormField(bool('B'))).toBe(true);
    expect(isFormField(multi('M'))).toBe(true);
    expect(isFormField(list('L'))).toBe(false);
  });

  it('lets a level of only lists be a button screen', () => {
    const node = buildSectionTree({ bans: list('Bans'), mutes: list('Mutes') });

    expect(isPureSection(node)).toBe(true);
    expect(listEntries(node).map(([k]) => k)).toEqual(['bans', 'mutes']);
    expect(formEntries(node)).toEqual([]);
  });

  it('lets lists sit beside sub-sections without forcing a form', () => {
    const node = buildSectionTree({ bans: list('Bans'), 'chat.filter': bool('Filter') });

    expect(isPureSection(node)).toBe(true);
    expect(node.children.map(c => c.path)).toEqual(['chat']);
  });

  it('still forces a form as soon as one real field is present', () => {
    const node = buildSectionTree({ bans: list('Bans'), motd: bool('MOTD') });

    expect(isPureSection(node)).toBe(false);
    // The list is still there — on a form level it renders read-only, with its command.
    expect(listEntries(node).map(([k]) => k)).toEqual(['bans']);
    expect(formEntries(node).map(([k]) => k)).toEqual(['motd']);
  });

  it('treats multiselect as a field, so it forces a form like any other', () => {
    expect(isPureSection(buildSectionTree({ features: multi('Features') }))).toBe(false);
  });

  it('is not a button screen when there is nothing at all to press', () => {
    expect(isPureSection(buildSectionTree({}))).toBe(false);
  });
});

import type { Entity, Player } from '@minecraft/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../../../components/Button';
import { Container } from '../../../components/Container';
import { EmbedSlots } from '../../../components/Embed';
import { Form } from '../../../components/Form';
import { Image } from '../../../components/Image';
import { List } from '../../../components/List';
import { Panel } from '../../../components/Panel';
import { Screen } from '../../../components/Screen';
import { Scroll } from '../../../components/Scroll';
import { Text } from '../../../components/Text';
import { Toggle } from '../../../components/Toggle';
import { Trans } from '../../../components/Trans';
import { TranslationContext } from '../../../data/Translation';
import { useState } from '../../../hooks';
import { compiledValuesOf } from '../../../hosts/form/runtime';
import { LOOK_PREFIX } from '../../../hosts/form/contract';
import type { JSX } from '../../../jsx';
import { BUILD_OWNER, entityOwner, getFibersForOwner, playerOwner, type Owner } from '../../fabric';
import { childElements } from '../../guards';
import { bakedWalk } from '../../ir/probe';
import { visibleCandidates } from '../../ir/claims';
import { setBuildLocales, takeWidthSlot } from '../buildPass';
import * as layout from '../phases/layout';
import type { CompiledSnapshot } from '../screens';
import { clearSession, setSessionRoot } from '../session';
import { buildTree, cleanupComponentTree } from '../tree';

const owners: Owner[] = [];
let sequence = 0;
const snapshot: CompiledSnapshot = { shape: '', texts: [], vis: [] };

function el(type: unknown, props: Record<string, unknown> = {}): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- lazy component factory uses the JSX element shape
  return { type, props } as JSX.Element;
}

function player(): Owner {
  sequence += 1;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- tree building only reads the player's identity
  const owner = playerOwner({ id: `compiled-build-${String(sequence)}` } as Player);

  owners.push(owner);

  return owner;
}

function built(root: JSX.Element, options: { owner?: Owner; snapshot?: CompiledSnapshot; debug?: boolean; compiled?: boolean } = {}): JSX.Element {
  const owner = options.owner ?? player();

  setSessionRoot(owner, root, { debug: options.debug === true, snapshot: options.snapshot });

  return buildTree(root, owner, options.compiled);
}

function walk(root: JSX.Element): JSX.Element[] {
  return [root, ...childElements(root.props.children).flatMap(walk)];
}

afterEach(() => {
  for (const owner of owners.splice(0)) {
    cleanupComponentTree(owner);
    clearSession(owner);
  }

  cleanupComponentTree(BUILD_OWNER);
  clearSession(BUILD_OWNER);
  setBuildLocales(undefined);
  vi.restoreAllMocks();
});

describe('building compiled action form values', () => {
  it('skips layout only for a player with a compiled snapshot and debug disabled', () => {
    const measure = vi.spyOn(layout, 'computeLayout');
    const root = el(Screen, { children: el(Panel, { width: 250, height: 80, children: el(Text, { maxLength: 8, children: 'hello' }) }) });
    const fast = built(root, { snapshot, compiled: true });

    expect(measure).not.toHaveBeenCalled();
    expect(walk(fast).find(node => node.type === 'panel')?.props.jsonUIWidth).toBeUndefined();

    for (const options of [
      { snapshot, compiled: true, debug: true },
      { compiled: true },
      { snapshot, compiled: false },
      { snapshot },
      { owner: BUILD_OWNER, snapshot, compiled: true },
    ]) {
      measure.mockClear();
      const measured = built(root, options);

      expect(measure).toHaveBeenCalledOnce();
      expect(walk(measured).find(node => node.type === 'panel')?.props.jsonUIWidth).toBe(250);
    }
  });

  it('preserves entries, callbacks, localized messages, list capacity, embed slots and inherited state', () => {
    const snapshot: CompiledSnapshot = { shape: '', texts: [0, 1, 2, 3, 4, 5], vis: [] };
    const onPress = vi.fn();
    const onEmbed = vi.fn();
    const root = el(TranslationContext, {
      value: (key: string): string | undefined => key === 'remote.long.translation.key' ? 'Name' : undefined,
      children: el(Screen, { children: el(Panel, {
        children: [
          el(Text, { maxLength: 4, children: 'literal long text' }),
          el(Text, { maxLength: 4, wordBreak: 'break-word', children: 'remote.long.translation.key' }),
          el(Text, { maxLength: 4, children: { translate: 'remote.name', with: ['Alex'] } }),
          el(Image, { texture: 'textures/ui/live-icon', live: true }),
          el(Panel, { enabled: false, children: el(Button, { testId: 'disabled', enabled: true, onPress }) }),
          el(Panel, { visible: false, children: el(Panel, { children: el(Button, { testId: 'hidden', visible: true, onPress }) }) }),
          el(EmbedSlots, { count: 3, values: ['core_addon:foreign', 't', 'slot value'], onPress: onEmbed }),
          el(List, {
            max: 3, items: ['one'],
            row: (value: string | undefined): JSX.Element => el(Panel, { children: [el(Button, { onPress }), el(Text, { maxLength: 12, children: value ?? '' })] }),
          }),
          el(Button, { testId: 'look', background: 'selected', onPress, children: el(Text, { children: 'Select' }) }),
        ],
      }) }),
    });
    const measured = built(root, { snapshot, compiled: true, debug: true });
    const lookPosition = bakedWalk(measured).findIndex(node => node.props.testId === 'look');
    const recorded: CompiledSnapshot = { ...snapshot,
      vis: visibleCandidates(measured).map((_, index) => index),
      looks: [{ position: lookPosition, type: 'button', props: [{ position: lookPosition, prop: 'background' }], combinations: [['default'], ['selected']] }],
    };
    const measure = vi.spyOn(layout, 'computeLayout');
    const fast = built(root, { snapshot: recorded, compiled: true });
    const expected = compiledValuesOf(measured, recorded);
    const actual = compiledValuesOf(fast, recorded);

    expect(measure).not.toHaveBeenCalled();
    expect(actual.values).toEqual(expected.values);
    expect(actual.values).toContain('lite');
    expect(actual.values).toContain('remote.long.translation.key');
    expect(actual.values).toContain(`${LOOK_PREFIX}1`);
    expect(actual.entries.map(({ element, ...entry }) => ({ ...entry, enabled: element.props.enabled, visible: element.props.visible, nativeArgs: element.nativeArgs })))
      .toEqual(expected.entries.map(({ element, ...entry }) => ({ ...entry, enabled: element.props.enabled, visible: element.props.visible, nativeArgs: element.nativeArgs })));
    expect(walk(fast).find(node => node.props.testId === 'disabled')?.props.enabled).toBe(false);
    expect(walk(fast).find(node => node.props.testId === 'hidden')?.props.visible).toBe(false);
    const pressed = actual.entries.find(entry => entry.element.props.testId === 'look')?.element.props.onPress;

    expect(pressed).toBe(onPress);
    expect(walk(fast).map(node => node.type)).toEqual(walk(measured).map(node => node.type));
    expect(root.props.children).toBeDefined();
  });

  it('keeps hooked component identity and state across value-only rebuilds', () => {
    const snapshot: CompiledSnapshot = { shape: '', texts: [0], vis: [] };
    const owner = player();
    let update: ((next: number) => void) | undefined;

    const Stateful = (): JSX.Element => {
      const [value, setValue] = useState(0);

      update = setValue;

      return el(Text, { maxLength: 8, children: String(value) });
    };

    const root = el(Screen, { children: el(Panel, { children: el(Stateful) }) });
    const first = built(root, { owner, snapshot, compiled: true });
    const fibers = getFibersForOwner(owner);

    expect(compiledValuesOf(first, snapshot).values).toEqual(['§r0']);
    update?.(9);
    const second = built(root, { owner, snapshot, compiled: true });

    expect(compiledValuesOf(second, snapshot).values).toEqual(['§r9']);
    expect(getFibersForOwner(owner)).toEqual(fibers);
  });

  it('expands a thousand prepared rows without measuring their layout or dropping entries', () => {
    const snapshot: CompiledSnapshot = { shape: '', texts: Array.from({ length: 1000 }, (_, index) => index), vis: [] };
    const measure = vi.spyOn(layout, 'computeLayout');
    const onPress = vi.fn();
    const row = vi.fn((value: string | undefined): JSX.Element => el(Panel, {
      children: [el(Button, { onPress }), el(Text, { maxLength: 12, children: value ?? '' })],
    }));
    const root = el(Screen, { children: el(Panel, { children: el(List, { max: 1000, items: ['one', 'two'], row }) }) });
    const tree = built(root, { snapshot, compiled: true });
    const { entries, values } = compiledValuesOf(tree, snapshot);

    expect(measure).not.toHaveBeenCalled();
    expect(row).toHaveBeenCalledTimes(1000);
    expect(entries).toHaveLength(2001);
    expect(values.slice(-1000, -998)).toEqual(['one', 'two']);
    expect(values.slice(-998)).toEqual(Array.from({ length: 998 }, () => ''));
    expect(entries.filter(entry => entry.element.props.onPress === onPress)).toHaveLength(1000);
  });

  it('expands translated pieces from the recorded width round and clears its slots afterwards', () => {
    const onPress = vi.fn();
    const recorded: CompiledSnapshot = { ...snapshot, trans: [{ s: 0, l: [[{ c: [], v: 'Open ' }, { c: ['go'], v: 'the page' }], [{ c: ['go'], v: 'continued' }]] }] };
    const root = el(Screen, { children: el(Panel, { children: el(Trans, {
      i18nKey: 'guide.link', components: { go: el(Button, { onPress }) },
    }) }) });
    const measure = vi.spyOn(layout, 'computeLayout');
    const fast = built(root, { snapshot: recorded, compiled: true });
    const actual = compiledValuesOf(fast, recorded);

    expect(measure).not.toHaveBeenCalled();
    expect(actual.values).toEqual(['t', 't']);
    expect(actual.entries.every(entry => entry.element.props.onPress === onPress)).toBe(true);
    expect(walk(fast).filter(node => node.type === 'text').map(node => node.props.value)).toEqual([
      { tail: 'Open ' }, { tail: 'the page' }, { tail: 'continued' },
    ]);
    expect(takeWidthSlot()).toBeUndefined();
  });

  it('retains layout when look tables read solved geometry or literal overflow rewrites live text', () => {
    const snapshot: CompiledSnapshot = { shape: '', texts: [0], vis: [] };
    const root = el(Screen, { children: el(Panel, { children: el(Text, {
      width: 20, maxLength: 48, wordBreak: 'break-word', children: 'A literal sentence that must wrap',
    }) }) });
    const measure = vi.spyOn(layout, 'computeLayout');
    const overflow = built(root, { snapshot, compiled: true });

    expect(measure).toHaveBeenCalledOnce();
    expect(compiledValuesOf(overflow, snapshot).values[0]).toContain('\n');
    measure.mockClear();
    built(el(Screen, { children: el(Panel, { width: 120, height: 80 }) }), {
      snapshot: { ...snapshot, looks: [{ position: 0, type: 'panel', props: [{ position: 0, prop: 'jsonUIWidth' }], combinations: [[120]] }] },
      compiled: true,
    });

    expect(measure).toHaveBeenCalledOnce();
  });

  it('ignores baked literal wrapping unless a look table reads its text value', () => {
    const root = el(Screen, { children: el(Panel, { children: el(Button, {
      onPress: (): void => {}, children: el(Text, { width: 20, wordBreak: 'break-word', children: 'A baked caption that wraps' }),
    }) }) });
    const measured = built(root, { snapshot, compiled: true, debug: true });
    const measure = vi.spyOn(layout, 'computeLayout');
    const fast = built(root, { snapshot, compiled: true });

    expect(measure).not.toHaveBeenCalled();
    expect(compiledValuesOf(fast, snapshot).values).toEqual(compiledValuesOf(measured, snapshot).values);
    const elements = bakedWalk(measured);
    const button = elements.findIndex(node => node.type === 'button');
    const text = elements.findIndex(node => node.type === 'text');

    built(root, { compiled: true, snapshot: { ...snapshot, looks: [{
      position: button, type: 'button', props: [{ position: text, prop: 'value' }], combinations: [[elements[text]?.props.value]],
    }] } });

    expect(measure).toHaveBeenCalledOnce();
  });

  it('keeps geometry for modal fields and container owners despite a snapshot', () => {
    const measure = vi.spyOn(layout, 'computeLayout');
    const modal = el(Form, { children: el(Panel, { children: [el(Toggle, { name: 'on' }), el(Form.Button, { type: 'submit', children: 'Save' })] }) });

    built(modal, { snapshot, compiled: true });

    expect(measure).toHaveBeenCalledOnce();
    measure.mockClear();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- container building only reads the entity identity
    const owner = entityOwner({ id: 'compiled-build-entity' } as Entity);

    owners.push(owner);
    built(el(Container, { entity: 'core:test', children: el(Panel, { width: 120, height: 80 }) }), { owner, snapshot, compiled: true });

    expect(measure).toHaveBeenCalledOnce();
  });

  it('still validates compiled host restrictions and closes width rounds on failures', () => {
    expect(() => built(el(Container, { entity: 'core:test' }), { snapshot, compiled: true })).toThrow(/cannot be shown with render/);
    expect(() => built(el(Screen, { children: el(Scroll, { children: el(Scroll, { children: el(Text, { children: 'nested' }) }) }) }), { snapshot, compiled: true }))
      .toThrow(/cannot sit inside another/);
    expect(takeWidthSlot()).toBeUndefined();
  });
});

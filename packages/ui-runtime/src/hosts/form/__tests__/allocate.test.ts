import { describe, expect, it } from 'vitest';
import { registerNativeComponents } from '../../../components';
import { Button } from '../../../components/Button';
import { Panel } from '../../../components/Panel';
import { Screen } from '../../../components/Screen';
import { Text } from '../../../components/Text';
import { buildTree } from '../../../core/render/tree';
import { playerOwner } from '../../../core/fabric';
import type { JSX } from '../../../jsx';
import type { Player } from '@minecraft/server';
import { allocate } from '../allocate';
import { keyFrom, titleFor } from '../contract';

registerNativeComponents();

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- only the id is read
const player = { id: 'form-allocate' } as unknown as Player;

const build = (screen: () => JSX.Element): JSX.Element =>
  buildTree(Screen({ children: { type: screen, props: {} } }), playerOwner(player));

describe('a form placement', () => {
  it('gives an entry to each press, in document order', () => {
    const tree = build((): JSX.Element => Panel({
      children: [
        Button({ children: Text({ children: 'one' }) }),
        Button({ children: Text({ children: 'two' }) }),
      ],
    }));

    const { entries, size } = allocate(tree);

    expect(entries.map(entry => entry.entry)).toEqual([0, 1]);
    expect(entries.every(entry => entry.role === 'button')).toBe(true);
    expect(size).toBe(2);
  });

  it('spends nothing on a screen that is only static', () => {
    const tree = build((): JSX.Element => Panel({
      children: [Text({ children: 'BEDROCK CORE' }), Text({ children: 'no entries here' })],
    }));

    expect(allocate(tree)).toEqual({ entries: [], size: 0 });
  });

  it('gives a live text its own entry, after every press', () => {
    const tree = build((): JSX.Element => Panel({
      children: [
        Text({ maxLength: 12, children: 'live' }),
        Button({ children: Text({ children: 'press' }) }),
      ],
    }));

    const { entries } = allocate(tree);

    // The button is a cell and the label a channel, so the press keeps entry 0
    // whatever text the screen gains — a selection index stays put.
    expect(entries.map(entry => [entry.entry, entry.role, entry.length])).toEqual([
      [0, 'button', undefined],
      [1, undefined, 12],
    ]);
  });

  it('numbers the same tree the same way twice, which is what the runtime relies on', () => {
    const screen = (): JSX.Element => Panel({
      children: [Button({ children: Text({ children: 'a' }) }), Text({ maxLength: 4, children: 'b' })],
    });

    const first = allocate(build(screen));
    const second = allocate(build(screen));

    expect(first.entries.map(entry => entry.entry)).toEqual(second.entries.map(entry => entry.entry));
    expect(first.size).toBe(second.size);
  });
});

describe('a compiled title', () => {
  it('carries the interpreter header, so the library container still sizes itself', () => {
    expect(titleFor('drav0011_shop_home')).toBe('corev0009core1:drav0011_shop_home');
  });

  it('round-trips the screen key', () => {
    expect(keyFrom(titleFor('core_furnace'))).toEqual({ encoding: 1, key: 'core_furnace' });
  });

  it('is not confused by an interpreter title, which carries scroll metadata instead', () => {
    expect(keyFrom('corev0009s:scrolls;;;;;;;')).toBeUndefined();
    expect(keyFrom('some other form')).toBeUndefined();
  });

  it('refuses an encoding this build cannot write', () => {
    expect(keyFrom('corev0009core9:whatever')).toBeUndefined();
  });
});

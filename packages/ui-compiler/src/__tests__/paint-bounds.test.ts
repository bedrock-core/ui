import { Button, Container, Image, Panel, Screen, useExit, type JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { eachControl, find, findAll } from '../__fixtures__/helpers';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';
import type { Control } from '../jsonui';

const compile = (host: 'container' | 'form', content: () => JSX.Element) => host === 'container'
  ? compileScreen(() => Container({ entity: 'bounds:test', width: 100, height: 80, children: content() }), { namespace: 'bounds', name: 'paint' })
  : compileFormScreen(() => Screen({ children: content() }), { namespace: 'bounds', name: 'paint' });
const button = (width = 25, hitSlop?: number): JSX.Element => Button({
  width, height: 18, padding: 2, hitSlop, background: 'bounds/button',
  backgroundHover: 'bounds/hover', backgroundPressed: 'bounds/pressed', backgroundLocked: 'bounds/locked',
  justifyContent: 'center', alignItems: 'center', children: Image({ width: 8, height: 6, texture: 'bounds/icon' }),
});
const named = (control: Control, name: string): Control => {
  const value = control.controls?.flatMap(entry => Object.entries(entry)).find(([key]) => key.split('@')[0] === name)?.[1];

  if (value === undefined) { throw new Error(`Missing ${name}`); }

  return value;
};

describe.each(['container', 'form'] as const)('%s paint bounds', (host) => {
  it('paints content plus padding, with margins outside the background', () => {
    const result = compile(host, () => Panel({ width: 40, height: 30, padding: 3, margin: 5, background: 'bounds/panel', children: button(25) }));
    const backgrounds: Control[] = [];

    eachControl(result.document, (_name, control) => { if (control.texture === 'bounds/panel') { backgrounds.push(control); } });
    expect(backgrounds).toHaveLength(1);
    expect(backgrounds[0]).toMatchObject({ size: ['100%', '100%'], keep_ratio: false });
    const placement = find(result.document, name => name.split('@')[0] === 'button_1')[1];

    expect(placement.offset).toEqual([3, 3]);
    expect(placement.size).toEqual([25, 18]);
  });

  it.each([undefined, 0, 1, 3])('keeps layout and backgrounds unchanged with hitSlop %s', (hitSlop) => {
    const result = compile(host, () => Panel({ padding: 4, flexDirection: 'row', children: button(25, hitSlop) }));
    const placement = find(result.document, name => name.split('@')[0] === 'button_1')[1];

    expect(placement.offset).toEqual([4, 4]);
    expect(placement.size).toEqual([25, 18]);
    const backgrounds: Control[] = [];

    eachControl({ namespace: 'bounds_faces', ...result.faces }, (_name, control) => { if (control.texture?.startsWith('bounds/')) { backgrounds.push(control); } });
    expect(backgrounds.filter(control => control.texture !== 'bounds/icon')).toHaveLength(4);
    expect(backgrounds.filter(control => control.texture !== 'bounds/icon').every(control => JSON.stringify(control.size) === '["100%","100%"]')).toBe(true);
    const states = find(result.document, name => name.startsWith('press_') && name.split('@')[0].endsWith('_states'))[1];
    const slop = hitSlop ?? 0;

    if (slop === 0) {
      expect(states.offset).toBeUndefined();
    } else {
      expect(states).toMatchObject({ size: [`100% + ${String(slop * 2)}px`, `100% + ${String(slop * 2)}px`], offset: [-slop, -slop] });
      for (const state of ['default', 'hover', 'pressed']) {
        expect(named(states, state)).toMatchObject({ size: [`100% - ${String(slop * 2)}px`, `100% - ${String(slop * 2)}px`], offset: [slop, slop] });
      }
    }
  });

  it('does not change row height or sibling placement when the click target expands', () => {
    const result = compile(host, () => Panel({ padding: 4, gap: 4, alignItems: 'center', flexDirection: 'row', children: [button(25), button(15, 10)] }));
    const first = find(result.document, name => name.split('@')[0] === 'button_1')[1];
    const second = find(result.document, name => name.split('@')[0] === 'button_2')[1];

    const baseline = compile(host, () => Panel({ padding: 4, gap: 4, alignItems: 'center', flexDirection: 'row', children: [button(25), button(15)] }));

    expect(first.offset).toEqual(find(baseline.document, name => name.split('@')[0] === 'button_1')[1].offset);
    expect(second.offset).toEqual(find(baseline.document, name => name.split('@')[0] === 'button_2')[1].offset);
    expect(first.size).toEqual([25, 18]);
    expect(second.size).toEqual([15, 18]);
  });

  it('shares artwork but keeps distinct input definitions for different hit areas', () => {
    const result = compile(host, () => Panel({ flexDirection: 'row', children: [button(25, 1), button(25, 3)] }));
    const states = findAll(result.document, name => name.startsWith('press_') && name.split('@')[0].endsWith('_states'));

    expect(states).toHaveLength(2);
    expect(states.map(([, state]) => state.size)).toEqual([['100% + 2px', '100% + 2px'], ['100% + 6px', '100% + 6px']]);
    const backgrounds: Control[] = [];

    eachControl({ namespace: 'bounds_faces', ...result.faces }, (_name, control) => { if (control.texture === 'bounds/button') { backgrounds.push(control); } });
    expect(backgrounds).toHaveLength(1);
  });
});

it('keeps the close artwork 15px while retaining its 21px native hit area', () => {
  const close = (): JSX.Element => {
    const exit = useExit();

    return Container({ entity: 'bounds:test', width: 60, height: 40, children: Panel({ padding: 4, flexDirection: 'row', alignItems: 'center', gap: 4, children: [
      button(25), Button({ width: 15, height: 15, hitSlop: 3, background: 'bounds/close', onPress: exit }),
    ] }) });
  };
  const result = compileScreen(close, { namespace: 'bounds', name: 'close' });
  const exits: Control[] = [];

  eachControl(result.document, (_name, control) => {
    if (control.button_mappings?.some(mapping => mapping.to_button_id === 'button.menu_exit')) { exits.push(control); }
  });
  expect(exits).toHaveLength(1);
  expect(exits[0]).toMatchObject({ size: [21, 21], offset: [30, 2.5] });
  for (const state of ['default', 'hover', 'pressed', 'locked']) {
    expect(named(exits[0], state)).toMatchObject({ size: ['100% - 6px', '100% - 6px'], offset: [3, 3] });
  }
  expect(result.allocation.drawn).toBe(1);
});

it.each([-1, Infinity, -Infinity, NaN])('rejects invalid hitSlop %s', (hitSlop) => {
  expect(() => Button({ hitSlop })).toThrow('Button hitSlop must be a finite nonnegative number.');
});

import { describe, expect, it } from 'vitest';
import { Button } from '../../../components/Button';
import { Container } from '../../../components/Container';
import { Panel } from '../../../components/Panel';
import { Slot } from '../../../components/Slot';
import { Text } from '../../../components/Text';
import { useState } from '../../../hooks';
import { buildScreenOnce } from '../../../hosts/chest/build';
import type { FunctionComponent, JSX } from '../../../jsx';
import { probeLiveness } from '../probe';

const screen = (body: FunctionComponent): FunctionComponent =>
  (): JSX.Element => Container({ entity: 'core:probe', children: [{ type: body, props: {} }] });

const probe = (body: FunctionComponent): ReturnType<typeof probeLiveness> =>
  probeLiveness(() => buildScreenOnce(screen(body)));

describe('probeLiveness', () => {
  it('finds nothing in a screen that holds no state', () => {
    const result = probe((): JSX.Element => Text({ children: 'BEDROCK CORE' }));

    expect(result.frozen).toEqual([]);
    expect(result.shape).toBeUndefined();
  });

  it('finds baked text that a state change moves, and how long it got', () => {
    const result = probe((): JSX.Element => {
      const [count] = useState(0);

      return Text({ children: `smelted ${count}` });
    });

    expect(result.frozen).toHaveLength(1);
    expect(result.frozen[0]).toMatchObject({ position: 0, before: 'smelted 0', after: 'smelted 1' });
    expect(result.frozen[0]?.longest).toBe('smelted 1'.length);
  });

  it('leaves live text alone: it already reserved its cells', () => {
    const result = probe((): JSX.Element => {
      const [count] = useState(0);

      return Text({ maxLength: 12, children: `smelted ${count}` });
    });

    expect(result.frozen).toEqual([]);
  });

  it('names only the text that moved, among several', () => {
    const result = probe((): JSX.Element => {
      const [count] = useState(0);

      return Panel({
        children: [
          Text({ children: 'HEADER' }),
          Text({ children: `count ${count}` }),
          Text({ children: 'FOOTER' }),
        ],
      });
    });

    expect(result.frozen.map(text => text.position)).toEqual([1]);
  });

  it('leaves a button\'s caption alone: its children ARE the face, baked by definition', () => {
    // What ore-styled does — it colours the caption by `enabled`, so a probe
    // moves the string. On a compiled screen only the background swaps, which
    // is the documented behaviour rather than a mistake to report.
    const result = probe((): JSX.Element => {
      const [ready] = useState(true);

      return Button({
        enabled: ready,
        children: Text({ children: `${ready ? '§f' : '§8'}go` }),
      });
    });

    expect(result.frozen).toEqual([]);
  });

  it('reports a state change that adds a cell, because the shape is numbered once', () => {
    const result = probe((): JSX.Element => {
      const [extra] = useState(false);

      return Panel({ children: extra ? [Slot({}), Slot({})] : [Slot({})] });
    });

    expect(result.shape).toBeDefined();
    expect(result.shape?.before).not.toBe(result.shape?.after);
  });

  it('says nothing about a value the component refuses, rather than failing the build', () => {
    const result = probe((): JSX.Element => {
      const [index] = useState(0);

      if (index !== 0) {
        throw new RangeError('only 0 is a real index here');
      }

      return Text({ children: 'steady' });
    });

    expect(result.frozen).toEqual([]);
    expect(result.shape).toBeUndefined();
  });

  it('finds a baked look that a state change moves', () => {
    const result = probe((): JSX.Element => {
      const [on] = useState(true);

      return Button({ background: on ? 'textures/ui/on' : 'textures/ui/off', children: Text({ children: 'flip' }) });
    });

    // One look given, four drawn: a button's hover, pressed and locked states
    // fall back to its background, so all four follow the state.
    expect(result.props.map(prop => prop.prop)).toEqual(['background', 'backgroundHover', 'backgroundLocked', 'backgroundPressed']);
    expect(result.props[0]).toMatchObject({ type: 'button', prop: 'background', before: '"textures/ui/on"', after: '"textures/ui/off"' });
  });

  it('gathers the looks one element takes, the build\'s first', () => {
    const result = probe((): JSX.Element => {
      const [on] = useState(true);

      return Button({ background: on ? 'textures/ui/on' : 'textures/ui/off', children: Text({ children: 'flip' }) });
    });

    expect(result.variants).toHaveLength(1);
    expect(result.variants[0]?.props.map(read => read.prop)).toEqual(['background', 'backgroundHover', 'backgroundLocked', 'backgroundPressed']);
    expect(result.variants[0]?.combinations[0]?.[0]).toBe('textures/ui/on');
    expect(result.variants[0]?.combinations[1]?.[0]).toBe('textures/ui/off');
    expect(result.variants[0]?.combinations).toHaveLength(2);
  });

  it('leaves a look that every state draws the same', () => {
    const result = probe((): JSX.Element => {
      const [on] = useState(true);

      return Panel({ children: Text({ maxLength: 8, children: String(on) }) });
    });

    expect(result.props).toEqual([]);
  });

  it('follows a field of an object in state, not only a primitive', () => {
    const result = probe((): JSX.Element => {
      const [style] = useState({ look: { texture: 'textures/ui/calm' } });

      return Panel({ background: style.look.texture });
    });

    expect(result.props).toHaveLength(1);
    expect(result.props[0]).toMatchObject({ prop: 'background', before: '"textures/ui/calm"' });
  });

  it('takes what a caption draws into the button\'s look', () => {
    const result = probe((): JSX.Element => {
      const [on] = useState(true);

      return Button({
        background: 'textures/ui/segment',
        children: Text({ color: on ? [1, 1, 1] : [0.4, 0.4, 0.4], children: on ? 'ON' : 'OFF' }),
      });
    });

    const [table] = result.variants;

    // The button holds still; its face does not, and the face is what a look is.
    expect(table?.type).toBe('button');
    expect(table?.props.map(read => read.prop)).toEqual(expect.arrayContaining(['__color', 'value']));
    expect(table?.combinations).toHaveLength(2);
  });

  it('pairs what different causes move, though no probe moves both at once', () => {
    // The colour follows the choice and the step follows the toggle. A probe
    // changes one at a time, so it never renders a stepped word in another
    // colour; the table has to hold every pairing all the same.
    const result = probe((): JSX.Element => {
      const [on] = useState(true);
      const [choice] = useState('b');

      return Panel({
        children: Text({
          marginLeft: on ? 0 : 10,
          color: choice === 'a' ? [1, 0, 0] : choice === 'b' ? [0, 1, 0] : [0, 0, 1],
          children: 'look',
        }),
      });
    });

    const [table] = result.variants;
    const colour = table?.props.findIndex(read => read.prop === '__color') ?? -1;
    const step = table?.props.findIndex(read => read.prop === 'jsonUIx') ?? -1;
    const pairs = new Set(table?.combinations.map(combination => JSON.stringify([combination[colour], combination[step]])));

    expect(result.variants).toHaveLength(1);
    // Two colours the probe reached (nothing here presses its way to a third),
    // two places: all four, the build's first — including the stepped word in
    // the other colour, which no probe rendered.
    expect(table?.combinations).toHaveLength(4);
    expect(pairs.size).toBe(4);
    expect(pairs).toContain(JSON.stringify([[0, 0, 1], table?.combinations.find(combination => combination[step] !== table.combinations[0]?.[step])?.[step]]));
    expect(table?.combinations[0]?.[colour]).toEqual([0, 1, 0]);
  });

  it('presses its way to a look no guess reaches', () => {
    // The chooser holds 'alpha', and 'beta' is written nowhere a probe could
    // read it — the tree draws the labels, not the keys. Only pressing the
    // second option puts it in its chosen look.
    const options = [{ value: 'alpha', label: 'A' }, { value: 'beta', label: 'B' }];

    const result = probe((): JSX.Element => {
      const [choice, choose] = useState('alpha');

      return Panel({
        children: options.map(option => Button({
          background: option.value === choice ? 'textures/ui/on' : 'textures/ui/off',
          onPress: () => { choose(option.value); },
          children: Text({ children: option.label }),
        })),
      });
    });

    expect(result.variants).toHaveLength(2);
    expect(result.variants[1]?.combinations.map(combination => combination[0]))
      .toEqual(['textures/ui/off', 'textures/ui/on']);
  });

  it('moves a boolean, a number and a string alike', () => {
    const result = probe((): JSX.Element => {
      const [on] = useState(true);
      const [size] = useState(3);
      const [name] = useState('steve');

      return Panel({
        children: [
          Text({ children: `on ${String(on)}` }),
          Text({ children: `size ${size}` }),
          Text({ children: `name ${name}` }),
        ],
      });
    });

    expect(result.frozen.map(text => text.position)).toEqual([0, 1, 2]);
  });
});

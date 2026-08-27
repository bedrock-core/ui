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

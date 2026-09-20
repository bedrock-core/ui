import { describe, expect, it } from 'vitest';
import { Button } from '../../../components/Button';
import { Container } from '../../../components/Container';
import { Panel } from '../../../components/Panel';
import { Text } from '../../../components/Text';
import { useState } from '../../../hooks';
import { buildScreenOnce } from '../../../hosts/chest/build';
import type { FunctionComponent, JSX } from '../../../jsx';
import { analyze } from '../analyze';
import { claim, visiblesAt } from '../claims';
import { probeLiveness } from '../probe';

const screen = (body: FunctionComponent): FunctionComponent =>
  (): JSX.Element => Container({ entity: 'core:probe', children: [{ type: body, props: {} }] });

const probe = (body: FunctionComponent): ReturnType<typeof probeLiveness> =>
  probeLiveness(() => buildScreenOnce(screen(body)));

/** A screen whose panel hides with state — the carried-visible reference case. */
const Gated = (): JSX.Element => {
  const [open] = useState(true);

  return Panel({
    children: [
      Text({ children: 'HEADER' }),
      Panel({ visible: open, children: [Text({ children: 'DETAILS' })] }),
    ],
  });
};

describe('carried visible', () => {
  it('probes a visible that state flips, as an ordinal into the shared walk', () => {
    const result = probe(Gated);

    // Not an error: no frozen text (the strings did not change) and no shape
    // change (the subtree is still in the tree, only hidden).
    expect(result.frozen).toEqual([]);
    expect(result.shape).toBeUndefined();
    expect(result.liveVisibles).toHaveLength(1);
  });

  it('reports nothing for a visible no state reaches', () => {
    const result = probe((): JSX.Element => Panel({
      visible: true,
      children: [Text({ children: 'STATIC' })],
    }));

    expect(result.liveVisibles).toEqual([]);
  });

  it('recovers the same element from the ordinal on a fresh render of the tree', () => {
    const built = buildScreenOnce(screen(Gated));
    const { liveVisibles } = probe(Gated);

    const recovered = visiblesAt(built, liveVisibles);

    expect(recovered.size).toBe(1);

    const [element] = recovered;

    // The gated panel, not the header and not the root: its child is DETAILS.
    expect(JSON.stringify(element)).toContain('DETAILS');
  });

  it('claims a bool channel ahead of the same element\'s text', () => {
    const built = buildScreenOnce(screen((): JSX.Element => Panel({
      children: [Text({ maxLength: 8, children: 'live' })],
    })));

    // Mark the live text's own element as carried-visible too.
    const textElement = [...analyze(built).texts.keys()][0];

    if (textElement === undefined) {
      throw new Error('the harness lost its live text');
    }

    const { channels } = claim(built, analyze(built, new Set([textElement])));

    expect(channels.map(channel => channel.carrier)).toEqual(['bool', 'text']);
    expect(channels[0]?.length).toBe(1);
  });

  it('treats a probe under a button as the face it is, not a carrier', () => {
    const result = probe((): JSX.Element => {
      const [on] = useState(true);

      return Button({
        onPress: () => undefined,
        children: [Panel({ visible: on, children: [Text({ children: 'CAPTION' })] })],
      });
    });

    expect(result.liveVisibles).toEqual([]);
  });
});

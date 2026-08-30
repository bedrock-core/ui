import type { JSX } from '@bedrock-core/ui-runtime';
import { Form, Panel, Text, useState } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { eachControl } from '../../../__fixtures__/helpers';
import type { Control, Document } from '../../../jsonui';
import { compileFormScreen } from '../compile';

/**
 * The form's carriers beyond a press: a carried visible on either form host,
 * and live text on the modal's rows. Each is one entry (or row) of the
 * screen's own, read back by a gate or a label the emitter bakes the index
 * into — the compiled shape of [03-ir]'s bool and text carriers.
 */

const gates = (document: Document): Control[] => {
  const found: Control[] = [];

  eachControl(document, (name, control) => {
    if (name.endsWith('_vis')) {
      found.push(control);
    }
  });

  return found;
};

describe('carried visible on the action form', () => {
  const Screen = (): JSX.Element => {
    const [open] = useState(true);

    return Panel({
      children: [
        Text({ children: 'HEADER' }),
        Panel({ visible: open, children: [Text({ children: 'DETAILS' })] }),
      ],
    });
  };

  const compiled = compileFormScreen(Screen, { namespace: 'a', name: 'gated' });

  it('spends one entry on the visible, and records the ordinal for the runtime', () => {
    expect(compiled.entries).toHaveLength(1);
    expect(compiled.entries[0]?.carrier).toBe('bool');
    expect(compiled.snapshot.vis).toHaveLength(1);
  });

  it('wraps the subtree in a gate reading that entry', () => {
    const [gate] = gates(compiled.document);

    expect(gate?.collection_name).toBe('form_buttons');

    const inner = gate?.controls?.[0]?.gate;

    expect(inner?.collection_index).toBe(0);
    expect(inner?.property_bag?.['#visible']).toBe(true);
    expect(JSON.stringify(inner?.bindings)).toContain('#form_button_text');
    expect(JSON.stringify(inner?.bindings)).toContain("(not (#vis_value = '0'))");
  });

  it('bakes the fingerprint and the baked strings for debug', () => {
    expect(compiled.snapshot.shape).toContain('bool:1');
    expect(compiled.snapshot.baked).toEqual(['HEADER', 'DETAILS']);
  });
});

describe('carriers on the modal', () => {
  const Screen = (): JSX.Element => {
    const [nick, setNick] = useState('');
    const [open] = useState(true);

    return Form({
      onSubmit: ({ values }): void => { setNick(String(values.nick ?? '')); },
      children: Panel({
        children: [
          Form.Toggle({ name: 'sound' }),
          Text({ maxLength: 10, children: `saved ${nick}` }),
          Panel({ visible: open, children: [Text({ children: 'EXTRA' })] }),
          Form.Button({ type: 'submit', label: 'Save' }),
        ],
      }),
    });
  };

  const compiled = compileFormScreen(Screen, { namespace: 'a', name: 'modal_carriers' });

  it('rides rows, not entries: the modal keeps form_buttons empty', () => {
    expect(compiled.entries).toHaveLength(0);
    expect(compiled.snapshot.vis).toHaveLength(1);
  });

  it('reads live text out of its custom_form row', () => {
    const json = JSON.stringify(compiled.document);

    expect(json).toContain('"#custom_text"');
    // The live label's index host reads the modal collection, at the row the
    // runtime writes: field row 0, text row 1.
    const hosts: Control[] = [];

    eachControl(compiled.document, (_name, control) => {
      if (control.collection_name === 'custom_form') {
        hosts.push(control);
      }
    });

    const indices = hosts.flatMap(host => host.controls ?? [])
      .map(entry => Object.values(entry)[0]?.collection_index)
      .filter((index): index is number => typeof index === 'number')
      .sort((a, b) => a - b);

    expect(indices).toEqual([0, 1, 2]);
  });

  it('gates the visible through its own custom_form row', () => {
    const [gate] = gates(compiled.document);

    expect(gate?.collection_name).toBe('custom_form');
    expect(JSON.stringify(gate)).toContain('"collection_index": 2'.replace(': ', ':'));
  });
});

import type { JSX } from '@bedrock-core/ui-runtime';
import { Form, Panel, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { eachControl } from '../../../__fixtures__/helpers';
import type { Control } from '../../../jsonui';
import { compileFormScreen } from '../compile';

describe('localized native form action captions', () => {
  it('paints default captions as vanilla keys and explicit labels as literal text', () => {
    const Screen = (): JSX.Element => Form({ children: Panel({ width: 160, children: [
      Form.Button({ type: 'submit' }),
      Form.Button({ type: 'exit', label: 'gui.submit' }),
    ] }) });
    const result = compileFormScreen(Screen, { namespace: 'defaults', name: 'settings' });
    const labels: Control[] = [];

    eachControl({ namespace: 'faces', ...result.faces }, (_name, control) => { if (control.type === 'label') { labels.push(control); } });

    expect(labels).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: 'gui.submit', localize: true }),
      expect.objectContaining({ text: 'gui.submit', localize: false }),
    ]));
  });

  it('localizes the default Close caption and preserves authored children', () => {
    const Screen = (): JSX.Element => Form({ children: Panel({ width: 160, children: [
      Form.Button({ type: 'submit', children: Text({ children: 'Keep my caption' }) }),
      Form.Button({ type: 'exit' }),
    ] }) });
    const result = compileFormScreen(Screen, { namespace: 'defaults', name: 'close' });
    const labels: Control[] = [];

    eachControl({ namespace: 'faces', ...result.faces }, (_name, control) => { if (control.type === 'label') { labels.push(control); } });

    expect(labels).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: 'gui.close', localize: true }),
      expect.objectContaining({ text: 'Keep my caption', localize: false }),
    ]));
    expect(labels.some(control => control.text === 'gui.submit')).toBe(false);
  });
});

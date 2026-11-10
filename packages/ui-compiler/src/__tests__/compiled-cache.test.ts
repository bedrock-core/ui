import { Container, Form, Panel, Screen, Text, useState, type JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it, vi } from 'vitest';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';

describe('compiler cache build probes', () => {
  it.each(['action', 'modal', 'chest'])('preserves state discovery and compiled output on %s', (host) => {
    const Row = (): JSX.Element => {
      const [count] = useState(0);
      return Text({ width: 100, maxLength: 4, children: String(count) });
    };
    const body = vi.fn(Row);
    const MemoRow = Object.defineProperty(body, Symbol.for('@bedrock-core/ui/compiler/pure'), { value: true });
    const root = (component: unknown): JSX.Element => {
      const child = { type: component, props: {} } as JSX.Element;
      const children = Panel({ width: 200, height: 40, children: child });
      if (host === 'chest') return Container({ entity: 'memo:host', children });
      if (host === 'modal') return Form({ children: Panel({ children: [children, Form.Button({ type: 'submit', label: 'Save' })] }) });
      return Screen({ children });
    };
    const spec = { namespace: 'memo', name: host };

    if (host === 'chest') {
      expect(compileScreen(() => root(MemoRow), spec)).toEqual(compileScreen(() => root(Row), spec));
    } else {
      expect(compileFormScreen(() => root(MemoRow), spec)).toEqual(compileFormScreen(() => root(Row), spec));
    }
    expect(body.mock.calls.length).toBeGreaterThan(1);
  });
});

import { Button, Container, Form, Panel, Screen, Text, useState, type JSX } from '@bedrock-core/ui-runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';

type Host = 'action' | 'modal' | 'chest';

const wrap = (host: Host, children: JSX.Element): JSX.Element => {
  if (host === 'chest') return Container({ entity: 'classification:host', children });
  if (host === 'modal') return Form({ children: Panel({ children: [children, Form.Button({ type: 'submit', label: 'Save' })] }) });
  return Screen({ children });
};

const counterRow = (): JSX.Element => {
  const [count] = useState(0);
  return Panel({ width: 200, height: 20, flexDirection: 'row', children: [
    Text({ maxLength: 8, children: String(count) }),
    Panel({ flexGrow: 1, height: 10, background: 'textures/ui/static' }),
    Panel({ width: 10, height: 10 }),
  ] });
};

afterEach(() => vi.restoreAllMocks());

describe('static layout and live appearance classification', () => {
  it.each<Host>(['action', 'modal', 'chest'])('bakes a static spacer beside live text on %s', (host) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const component = (): JSX.Element => wrap(host, counterRow());
    const spec = { namespace: 'classification', name: host };

    if (host === 'chest') {
      const compiled = compileScreen(component, spec);
      expect(compiled.looks).toEqual([]);
      expect(compiled.allocation.channels).toBe(1);
    } else {
      const compiled = compileFormScreen(component, spec);
      expect(compiled.snapshot.looks ?? []).toEqual([]);
      expect(compiled.entries.filter(entry => entry.carrier === 'enum')).toEqual([]);
      expect(compiled.snapshot.texts).toHaveLength(1);
    }
    expect(warning.mock.calls.flat().join('\n')).toContain("the build's placement is kept");
  });

  it('retains channels for authored size changes and the geometry they move', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const component = (): JSX.Element => {
      const [wide] = useState(false);
      return Screen({ children: Panel({ width: 200, flexDirection: 'row', children: [
        Panel({ width: wide ? 80 : 40, height: 10 }),
        Panel({ width: 10, height: 10 }),
      ] }) });
    };
    const compiled = compileFormScreen(component, { namespace: 'classification', name: 'sized' });
    const props = compiled.snapshot.looks?.flatMap(table => table.props.map(read => read.prop));

    expect(props).toContain('jsonUIWidth');
    expect(props).toContain('jsonUIx');
  });

  it('retains descendant geometry driven by an authored parent size', () => {
    const component = (): JSX.Element => {
      const [wide] = useState(false);
      return Screen({ children: Panel({ width: 200, height: 40,
        children: Panel({ width: wide ? 100 : 60, height: 20,
          children: Panel({ width: '100%', height: 10 }) }) }) });
    };
    const compiled = compileFormScreen(component, { namespace: 'classification', name: 'parent_size' });

    expect(compiled.snapshot.looks?.filter(table => table.props.some(read => read.prop === 'jsonUIWidth'))).toHaveLength(2);
  });

  it('retains layout changes driven by font scale', () => {
    const component = (): JSX.Element => {
      const [large] = useState(false);
      return Screen({ children: Panel({ width: 200, flexDirection: 'row', children: [
        Text({ scale: large ? 1.5 : 1, children: 'Caption' }),
        Panel({ width: 10, height: 10 }),
      ] }) });
    };
    const compiled = compileFormScreen(component, { namespace: 'classification', name: 'font_scale' });

    expect(compiled.snapshot.looks?.flatMap(table => table.props.map(read => read.prop))).toContain('jsonUIx');
  });

  it('keeps a separate paint channel without carrying text-only spacer reflow', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const component = (): JSX.Element => {
      const [count] = useState(0);
      const [on] = useState(false);
      return Screen({ children: Panel({ width: 200, children: [
        Panel({ width: 150, height: 20, flexDirection: 'row', children: [
          Text({ maxLength: 8, children: String(count) }),
          Panel({ flexGrow: 1, height: 10 }),
        ] }),
        Panel({ width: 20, height: 10, background: on ? 'textures/ui/on' : 'textures/ui/off' }),
      ] }) });
    };
    const compiled = compileFormScreen(component, { namespace: 'classification', name: 'independent' });

    expect(compiled.snapshot.looks).toHaveLength(1);
    expect(compiled.snapshot.looks?.[0]?.props.map(read => read.prop)).toEqual(['background']);
    expect(compiled.entries.filter(entry => entry.carrier === 'enum')).toHaveLength(1);
  });

  it('retains geometry driven by authored text overflow settings', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const component = (): JSX.Element => {
      const [tall] = useState(false);
      return Screen({ children: Panel({ width: 100, height: 100, children: [
        Text({ width: 40, wordBreak: 'break-word', maxLines: tall ? 2 : 1,
          children: 'A sentence that wraps across several lines.' }),
        Panel({ width: 10, height: 10 }),
      ] }) });
    };
    const compiled = compileFormScreen(component, { namespace: 'classification', name: 'overflow' });

    expect(compiled.snapshot.looks?.flatMap(table => table.props.map(read => read.prop))).toContain('jsonUIy');
  });

  it('retains a button face layout with a state-driven caption', () => {
    const component = (): JSX.Element => {
      const [long] = useState(false);
      return Screen({ children: Panel({ children: Button({ width: 120, height: 30, alignItems: 'center',
        children: Text({ children: long ? 'A longer caption' : 'Short' }) }) }) });
    };
    const compiled = compileFormScreen(component, { namespace: 'classification', name: 'caption' });

    expect(compiled.snapshot.looks).toHaveLength(1);
    expect(compiled.snapshot.looks?.[0]?.type).toBe('button');
    expect(compiled.snapshot.looks?.[0]?.props.map(read => read.prop)).toEqual(expect.arrayContaining(['value', 'jsonUIx']));
  });

  it('still refuses a genuine live appearance on a modal', () => {
    const component = (): JSX.Element => {
      const [on] = useState(false);
      return wrap('modal', Panel({ width: 100, height: 10, background: on ? 'textures/ui/on' : 'textures/ui/off' }));
    };

    expect(() => compileFormScreen(component, { namespace: 'classification', name: 'modal_paint' })).toThrow('cannot follow');
  });
});

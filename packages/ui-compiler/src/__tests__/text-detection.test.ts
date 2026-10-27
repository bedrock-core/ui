import { Container, Panel, Text, useState, type JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { compileScreen } from '../compile';
import { findAll } from '../__fixtures__/helpers';

const compile = (maxLength?: number) => compileScreen((): JSX.Element => {
  const [value] = useState('initial');
  return Container({ entity: 'detect:host', width: 200, height: 60, children: Panel({ children: [
    Text({ maxLength: 4, children: 'constant' }),
    Text({ width: 120, maxLength, children: value }),
    Text({ children: 'TAIL' }),
  ] }) });
}, { namespace: 'detect', name: 'text' });

describe('detected text transport', () => {
  it('bakes constants and carries only the state-driven value without an opt-in', () => {
    const result = compile();
    expect(result.texts).toEqual([1]);
    expect(result.allocation).toEqual({ sentinels: 1, drawn: 0, channels: 1, size: 2 });
    expect(findAll(result.document, name => name.startsWith('glyph@'))).toHaveLength(1);
    expect(JSON.stringify(result.document)).toContain('cons');
    expect(JSON.stringify(result.document)).toContain('TAIL');
  });

  it.each([undefined, 4, 128, 256])('does not use maxLength=%s to select transport', (maxLength) => {
    const result = compile(maxLength);
    expect(result.texts).toEqual([1]);
    expect(result.allocation.channels).toBe(1);
  });

  it('spends no slot on a constant with maxLength', () => {
    const result = compileScreen(() => Container({ entity: 'detect:static', children: Text({ maxLength: 3, children: 'constant' }) }), { name: 'static' });
    expect(result.texts).toEqual([]);
    expect(result.allocation.size).toBe(1);
    expect(JSON.stringify(result.document)).toContain('con');
  });
});

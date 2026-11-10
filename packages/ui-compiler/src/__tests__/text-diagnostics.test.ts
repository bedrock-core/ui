import { Container, Form, Panel, Screen, Text, useState, type JSX } from '@bedrock-core/ui-runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileScreen } from '../compile';
import { compileFormScreen } from '../hosts/form/compile';

type Host = 'action' | 'modal' | 'chest';

function fixture(host: Host, options: { width?: number; hug?: boolean; testId?: string; initial?: string; next?: string } = {}): () => JSX.Element {
  return (): JSX.Element => {
    const [changed] = useState(false);
    const text = Text({
      width: options.width, hug: options.hug, testId: options.testId, maxLength: 64,
      children: changed ? options.next ?? 'Updated status' : options.initial ?? '',
    });
    const content = Panel({ width: 200, flexDirection: 'row', alignItems: 'center', children: text });

    if (host === 'chest') return Container({ entity: 'diagnostics:host', children: content });
    if (host === 'modal') return Form({ children: Panel({ children: [content, Form.Button({ type: 'submit', label: 'Save' })] }) });

    return Screen({ children: content });
  };
}

function compile(host: Host, options: Parameters<typeof fixture>[1] = {}): void {
  const component = fixture(host, options);
  const spec = { namespace: 'diagnostics', name: 'status' };

  if (host === 'chest') compileScreen(component, spec);
  else compileFormScreen(component, spec);
}

afterEach(() => vi.restoreAllMocks());

describe('live-text width diagnostics', () => {
  it.each<Host>(['action', 'modal', 'chest'])('identifies a growing label and suggests reserved width on %s', (host) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    compile(host, { testId: 'status-label' });
    const message = warning.mock.calls.flat().join('\n');

    expect(message).toContain('"status"');
    expect(message).toContain('testId="status-label"');
    expect(message).toMatch(/compiled width 1px; a probed value needs \d+px/);
    expect(message).toContain('`width` or `minWidth`');
    expect(message).toContain('`maxLength` limits text length, not layout width');
  });

  it('identifies an empty untagged label', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    compile('action');

    expect(warning.mock.calls.flat().join('\n')).toMatch(/<Text #\d+> \(initially empty\)/);
  });

  it('identifies an untagged label by its initial text', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    compile('action', { initial: 'Ready' });

    expect(warning.mock.calls.flat().join('\n')).toContain('initial text "Ready"');
  });

  it('does not warn when an authored width already fits the live values', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    compile('action', { width: 160 });

    expect(warning).not.toHaveBeenCalled();
  });

  it('does not suggest fixed width for a content-sized label', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    compile('action', { hug: true });

    expect(warning.mock.calls.flat().join('\n')).not.toContain('`maxLength` limits text length');
  });

  it('does not report clipping when the observed text only becomes narrower', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    compile('action', { initial: 'An initially long value', next: 'A' });

    expect(warning.mock.calls.flat().join('\n')).not.toContain('`maxLength` limits text length');
  });
});

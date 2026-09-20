import type { FunctionComponent, JSX } from '@bedrock-core/ui-runtime';
import { Link, Panel, Screen, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { compileFormScreen } from '../hosts/form/compile';

/** A screen of two links, the first carrying `params`, declared static when `declared` is set. */
const linksWith = (params: Readonly<Record<string, unknown>>, declared = false): FunctionComponent =>
  (): JSX.Element => Screen({
    ...declared ? { static: true } : {},
    children: Panel({
      gap: 4,
      children: [
        Link({ to: 'item', params, children: Text({ children: 'with params' }) }),
        Link({ to: 'shop:home', replace: true, children: Text({ children: 'home' }) }),
      ],
    }),
  });

describe('a static screen\'s links', () => {
  it('carry their params into the table, beside the key and replace', () => {
    const compiled = compileFormScreen(linksWith({ message: 'sent', count: 2, tags: ['a'], extra: null }), { namespace: 'shop', name: 'links' });

    expect(compiled.table?.targets).toEqual([
      { to: 'shop:item', params: { message: 'sent', count: 2, tags: ['a'], extra: null } },
      { to: 'shop:home', replace: true },
    ]);
  });

  it('keep the component when a link\'s params are not plain data', () => {
    const compiled = compileFormScreen(linksWith({ onPick: () => undefined }), { namespace: 'shop', name: 'scripted' });

    expect(compiled.table).toBeUndefined();
  });

  it('fail a screen declared static, naming what is not plain data', () => {
    expect(() => compileFormScreen(linksWith({ when: new Date(0) }, true), { namespace: 'shop', name: 'declared' }))
      .toThrow(/declares `<Screen static>`, but the params of the link to "item" are not plain data: `params\.when` is an instance of Date/);
  });
});

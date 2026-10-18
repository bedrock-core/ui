import type { FunctionComponent, JSX } from '@bedrock-core/ui-runtime';
import { Button, Panel, Screen, Text, useExit, withActionMetadata } from '@bedrock-core/ui-runtime';
import { Link } from '@bedrock-core/navigation';
import { describe, expect, it } from 'vitest';
import { compileFormScreen } from '../hosts/form/compile';
import { staticTable } from '../static';

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

    expect(compiled.table?.actions).toEqual([
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
      .toThrow(/declares `<Screen static>`, but an action is not plain data: .*when.*is an instance of Date/);
  });
});

describe('generic static action metadata', () => {
  it('preserves library metadata and resolves namespace-aware metadata factories', () => {
    const component = (): JSX.Element => Screen({ children: Panel({ children: [
      withActionMetadata(Button({ children: Text({ children: 'Inspect' }) }), { kind: 'inspect', id: 3 }),
      withActionMetadata(Button({ children: Text({ children: 'Open' }) }), ({ namespace }) => ({ kind: 'open', key: `${namespace}:item` })),
    ] }) });
    const compiled = compileFormScreen(component, { namespace: 'shop', name: 'actions' });

    expect(compiled.table?.actions).toEqual([{ kind: 'inspect', id: 3 }, { kind: 'open', key: 'shop:item' }]);
  });

  it('uses null for a native exit without requiring a navigation library', () => {
    let button: JSX.Element | undefined;
    const component = (): JSX.Element => {
      const exit = useExit();

      button = Button({ onPress: exit, children: Text({ children: 'Close' }) });

      return Screen({ children: Panel({ children: button }) });
    };
    const compiled = compileFormScreen(component, { namespace: 'shop', name: 'exit' });

    expect(compiled.table?.actions).toEqual([]);
    expect(staticTable([{ entry: 0, element: button!, role: 'button' }], 'shop')).toMatchObject({ actions: [null] });
  });

  it('retains the component when generic action metadata is not plain data', () => {
    const component = (): JSX.Element => Screen({ children: Panel({
      children: withActionMetadata(Button({}), { kind: 'inspect', when: new Date(0) }),
    }) });

    expect(compileFormScreen(component, { namespace: 'shop', name: 'dynamic' }).table).toBeUndefined();
  });
});

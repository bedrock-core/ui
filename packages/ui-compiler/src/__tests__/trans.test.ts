import type { FunctionComponent, JSX } from '@bedrock-core/ui-runtime';
import { Button, Link, Panel, Screen as ScreenRoot, Text, Trans } from '@bedrock-core/ui-runtime';
import { setBuildLocales } from '@bedrock-core/ui-runtime/compile';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONTENT_LAYER } from '../faces';
import { compileFormScreen, type CompiledFormScreen } from '../hosts/form/compile';
import type { Control } from '../jsonui';
import { eachControl } from '../__fixtures__/helpers';

const lazy = (type: unknown, props: Record<string, unknown>): JSX.Element => ({ type: type as FunctionComponent, props });

const tables = {
  en_US: { 'a.help': 'See <shop>the shop</shop> or <rules>the rules</rules>.' },
  es_ES: { 'a.help': 'Lee <rules>las reglas</rules> o mira <shop>la tienda</shop>.' },
};

const screenWith = (components: Record<string, JSX.Element>, root: Record<string, unknown> = { static: true }): FunctionComponent =>
  (): JSX.Element => ScreenRoot({ ...root, children: Panel({ width: 300, children: Trans({ i18nKey: 'a.help', width: '100%', components }) }) });

const links = {
  shop: lazy(Link, { to: 'shop', background: 'link', backgroundHover: 'link_hover' }),
  rules: lazy(Link, { to: 'rules', replace: true, background: 'link', backgroundHover: 'link_hover' }),
};

/** Every control of a document that matches. */
const controls = (screen: CompiledFormScreen, match: (control: Control) => boolean): Control[] => {
  const found: Control[] = [];

  eachControl(screen.document, (_name, control) => {
    if (match(control)) {
      found.push(control);
    }
  });

  return found;
};

describe('compiling a Trans', () => {
  beforeEach(() => {
    setBuildLocales({ defaultLocale: 'en_US', tables });
  });

  afterEach(() => {
    setBuildLocales(undefined);
  });

  it('reads its key in every language and writes each piece under a minted key', () => {
    const compiled = compileFormScreen(screenWith(links), { namespace: 'a', name: 'help' });

    expect(Object.values(compiled.lang.en_US ?? {})).toEqual(expect.arrayContaining(['See ', 'the shop', ' or ', 'the rules', '.']));
    expect(Object.values(compiled.lang.es_ES ?? {})).toEqual(expect.arrayContaining(['Lee ', 'las reglas', ' o mira ', 'la tienda', '.']));
    expect(Object.keys(compiled.lang.en_US ?? {}).every(key => key.startsWith('core.text.'))).toBe(true);
  });

  it('draws a press as a panel as big as its text, with the press sized to it', () => {
    const compiled = compileFormScreen(screenWith(links), { namespace: 'a', name: 'help' });
    const pieces = controls(compiled, control => JSON.stringify(control.size) === JSON.stringify(['100%cm', '100%cm']));

    // A language that orders the links the other way needs a piece for each order on the line.
    expect(pieces.length).toBeGreaterThanOrEqual(2);

    for (const piece of pieces) {
      const press = (piece.controls ?? []).map(entry => Object.values(entry)[0]).find(control => control?.collection_name !== undefined);

      expect(press?.size).toEqual(['100%sm', '100%sm']);
    }
  });

  it('draws a press\'s text above its face, at the layer a button\'s caption is drawn at', () => {
    const compiled = compileFormScreen(screenWith(links), { namespace: 'a', name: 'help' });
    const pieces = controls(compiled, control => JSON.stringify(control.size) === JSON.stringify(['100%cm', '100%cm']));

    for (const piece of pieces) {
      const children = (piece.controls ?? []).map(entry => Object.values(entry)[0]);
      const press = children.find(control => control?.collection_name !== undefined);
      const text = children.find(control => control !== press);

      expect(press?.layer).toBe(1);
      expect(text?.layer).toBe(CONTENT_LAYER);
    }
  });

  it('keeps a screen of links static, carrying no layout for a runtime render', () => {
    const compiled = compileFormScreen(screenWith(links), { namespace: 'a', name: 'help' });

    expect(compiled.table?.targets).toEqual(expect.arrayContaining([{ to: 'a:shop' }, { to: 'a:rules', replace: true }]));
    expect(compiled.snapshot.trans).toBeUndefined();
  });

  it('records its layout when a press runs a handler, so the runtime draws the same entries', () => {
    const handlers = {
      shop: lazy(Button, { onPress: () => undefined }),
      rules: lazy(Button, { onPress: () => undefined }),
    };
    const compiled = compileFormScreen(screenWith(handlers, {}), { namespace: 'a', name: 'scripted' });
    const [record] = compiled.snapshot.trans ?? [];
    const presses = record?.l.flat().filter(piece => piece.c.length > 0) ?? [];

    expect(compiled.table).toBeUndefined();
    expect(presses.length).toBe(compiled.entries.length);
  });

  it('styles a piece with the color of the Text its tag names', () => {
    setBuildLocales({ defaultLocale: 'en_US', tables: { en_US: { 'a.help': 'a <gold>gold</gold> word' } } });

    const compiled = compileFormScreen(screenWith({ gold: lazy(Text, { color: [1, 0.8, 0] }) }), { namespace: 'a', name: 'styled' });
    const colored = controls(compiled, control => control.type === 'label' && JSON.stringify(control.color) === JSON.stringify([1, 0.8, 0]));

    expect(colored).toHaveLength(1);
  });

  it('refuses a component that is neither a style nor a press', () => {
    setBuildLocales({ defaultLocale: 'en_US', tables: { en_US: { 'a.help': 'a <box>boxed</box> word' } } });

    expect(() => compileFormScreen(screenWith({ box: lazy(Panel, {}) }), { namespace: 'a', name: 'boxed' })).toThrow(/neither|<Text>/);
  });
});

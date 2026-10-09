import type { JSX } from '@bedrock-core/ui-runtime';
import { measureText, Screen } from '@bedrock-core/ui-runtime';
import { setBuildLocales } from '@bedrock-core/ui-runtime/compile';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Header } from '../../../ore-styled/src/Header';
import { Tabs } from '../../../ore-styled/src/Tabs/Tabs';
import { compileFormScreen } from '../hosts/form/compile';
import { eachControl } from '../__fixtures__/helpers';

describe('styled captions in their granted layout space', () => {
  beforeEach(() => {
    setBuildLocales({ defaultLocale: 'en_US', tables: {
      en_US: { 'caption.title': 'A very long header title that exceeds its trail room', 'caption.tab': 'A long label that exceeds its header' },
      es_ES: { 'caption.title': 'Corto', 'caption.tab': 'Breve' },
    } });
  });

  afterEach(() => { setBuildLocales(undefined); });

  it('fits each language to the Header caption slot between the controls', () => {
    const Subject = (): JSX.Element => Screen({ children: Header({ width: 200, height: 32, title: 'caption.title' }) });
    const compiled = compileFormScreen(Subject, { namespace: 'a', name: 'header' });
    const [long] = Object.values(compiled.lang.en_US ?? {});

    expect(long).toMatch(/^§0A very long.*\.\.\.$/);
    expect(measureText({ text: long, font: 'minecraftTen', fontSize: 1.2 }).width).toBeLessThanOrEqual(154);
    expect(Object.values(compiled.lang.es_ES ?? {})).toEqual(['§0Corto']);
  });

  it('fits translated Tab captions inside the padded header and centers them in both looks', () => {
    const Subject = (): JSX.Element => Screen({ children: Tabs({ width: 160, height: 80, children: Tabs.Tab({ label: 'caption.tab' }) }) });
    const compiled = compileFormScreen(Subject, { namespace: 'a', name: 'tabs' });
    const long = Object.values(compiled.lang.en_US ?? {});

    expect(long.length).toBeGreaterThan(0);
    expect(long.every(text => text.endsWith('...') && measureText({ text }).width <= 144)).toBe(true);
    expect(Object.values(compiled.lang.es_ES ?? {})).toEqual(['Breve']);
    const captions: unknown[] = [];

    eachControl(compiled.document, (_name, control) => {
      if (control.type === 'label') { captions.push(control.text_alignment); }
    });

    expect(captions.length).toBeGreaterThan(0);
    expect(captions.every(alignment => alignment === 'center')).toBe(true);
  });

  it('uses the Header caption color for a live trail without requiring formatting codes', () => {
    const Subject = (): JSX.Element => Screen({ children: Header({ width: 200, height: 32, trail: 'Root > Leaf' }) });
    const compiled = compileFormScreen(Subject, { namespace: 'a', name: 'live_header' });
    const colors: unknown[] = [];

    eachControl(compiled.document, (_name, control) => {
      if (control.type === 'label') { colors.push(control.color); }
    });

    expect(colors).toEqual([[0, 0, 0]]);
  });
});

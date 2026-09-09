import type { JSX } from '@bedrock-core/ui-runtime';
import { Button, Embed, EmbedSlots, Image, Panel, Screen as ScreenRoot, Text } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import { eachControl } from '../../../__fixtures__/helpers';
import type { Control, Document } from '../../../jsonui';
import { compileFormScreen } from '../compile';
import { formRouter } from '../router';

/**
 * A screen drawn into another pack's: the host reserves the first entries
 * with `<EmbedSlots>` and the embedded screen numbers its own from 1, gated
 * by the marker the host writes into entry 0. And the texture carrier: an
 * image whose path is an entry's string.
 */

/** The one child an entry host mounts, whatever reference it is mounted through. */
const cellOf = (control: Control | undefined): Control | undefined => {
  const [entry] = control?.controls ?? [];
  const [child] = entry === undefined ? [] : Object.values(entry);

  return typeof child === 'object' ? child : undefined;
};

const find = (document: Document, predicate: (name: string, control: Control) => boolean): Control | undefined => {
  let found: Control | undefined;

  eachControl(document, (name, control) => {
    if (found === undefined && predicate(name, control)) {
      found = control;
    }
  });

  return found;
};

describe('the host side: reserved slots', () => {
  const Host = (): JSX.Element => ScreenRoot({ children: Panel({
    children: [
      EmbedSlots({ count: 3, values: ['core_addon:x', '1', '0'] }),
      Button({ onPress: () => {}, children: [Text({ children: 'MINE' })] }),
    ],
  }) });

  const compiled = compileFormScreen(Host, { namespace: 'host', name: 'list' });

  it('numbers the slots first, then the host\'s own presses', () => {
    expect(compiled.entries.map(entry => entry.role)).toEqual(['button', 'button', 'button', 'button']);
    expect(compiled.entries[3]?.element.type).toBe('button');
  });

  it('emits nothing visible for a slot', () => {
    const slot = find(compiled.document, name => name.startsWith('embed_'));

    expect(slot?.size).toEqual([0, 0]);
    expect(slot?.visible).toBe(false);
  });

  it('is gated by its title like any screen', () => {
    expect(compiled.marker).toBeUndefined();
  });
});

describe('the embedded side: entries from 1, gated by the marker', () => {
  const Page = (): JSX.Element => ScreenRoot({ children: Embed({
    frame: { width: 300, height: 200 },
    area: { x: 114, y: 25, width: 185, height: 173 },
    children: [Button({ onPress: () => {}, children: [Text({ children: 'CONFIG' })] })],
  }) });

  const compiled = compileFormScreen(Page, { namespace: 'drav0011_economy', name: 'addon' });

  it('is laid out against the area, which is its canvas', () => {
    const screen = compiled.document['screen'];

    expect(typeof screen === 'object' && 'size' in screen ? screen.size : undefined).toEqual([185, 173]);
    expect(compiled.embed).toEqual({ frame: [300, 200], offset: [114, 25] });
  });

  it('starts its entries after the marker slot', () => {
    expect(compiled.entries[0]?.entry).toBe(1);

    const host = find(compiled.document, (_name, control) => control.collection_name === 'form_buttons' && cellOf(control)?.collection_index !== undefined);

    expect(cellOf(host)?.collection_index).toBe(1);
  });

  it('names the marker after the addon', () => {
    expect(compiled.marker).toBe('core_addon:drav0011_economy');
  });

  const routing = formRouter([{
    name: compiled.name, namespace: compiled.namespace, hasBackdrop: false, marker: compiled.marker, embed: compiled.embed,
  }], 'drav0011_economy');
  const gate = routing.router.drav0011_economy_gate_addon as Control;
  const inner = gate.controls?.[0]?.gate;

  it('routes through a gate reading entry 0 rather than the title', () => {
    expect(gate.collection_name).toBe('form_buttons');
    expect(inner?.collection_index).toBe(0);
    expect(inner?.property_bag?.['#visible']).toBe(false);
    expect(JSON.stringify(inner?.bindings)).toContain("(#marker = 'core_addon:drav0011_economy')");
    expect(JSON.stringify(inner?.bindings)).not.toContain('#title_text');
  });

  it('is mounted where the area sits in the host\'s centred frame', () => {
    const frame = inner?.controls?.[0]?.frame;
    const [mounted] = frame?.controls ?? [];
    const [name, screen] = Object.entries(mounted ?? {})[0] ?? [];

    expect(frame?.size).toEqual([300, 200]);
    expect(frame?.anchor_from).toBe('center');
    expect(name).toBe('screen@drav0011_economy_addon.screen');
    expect(screen?.anchor_from).toBe('top_left');
    expect(screen?.offset).toEqual([114, 25]);
  });
});

describe('the texture carrier', () => {
  const Screen = (): JSX.Element => ScreenRoot({ children: Panel({
    children: [Image({ live: true, texture: 'textures/ui/a', width: 16, height: 16 })],
  }) });

  const compiled = compileFormScreen(Screen, { namespace: 'a', name: 'icons' });

  it('spends one entry on the path', () => {
    expect(compiled.entries).toHaveLength(1);
    expect(compiled.entries[0]?.carrier).toBe('texture');
  });

  it('binds the entry\'s string as the image texture', () => {
    const image = find(compiled.document, (_name, control) => control.type === 'image' && control.texture === '#texture');

    expect(image).toBeDefined();
    expect(JSON.stringify(image?.bindings)).toContain('#form_button_texture');

    const host = find(compiled.document, (_name, control) => control.collection_name === 'form_buttons');

    expect(cellOf(host)?.collection_index).toBe(0);
  });
});

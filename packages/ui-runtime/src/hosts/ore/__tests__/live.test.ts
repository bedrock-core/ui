import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { Player } from '@minecraft/server';
import { __oreForms, ObservableString } from '../../../__mocks__/@minecraft/server-ui';
import { Experimental_OreUI, Panel, Text, Toggle, Slider, Dropdown, Option, Input, Button, Form, type ExperimentalOreUIProps } from '../../../components';
import { buildScreenTree } from '../../chest/build';
import { render } from '../../../core/render/lifecycle';
import { registerCompiledScreen } from '../../../core/render/screens';
import { triggerCleanup } from '../../../core/render/session';
import { playerOwner } from '../../../core/fabric';
import { useState } from '../../../hooks';
import type { FunctionComponent, JSX } from '../../../jsx';
import { ORE_INPUT_PREFIX, ORE_STATE_PREFIX, oreLayout, type OreState } from '../contract';

const players: Player[] = [];
let serial = 0;
const tick = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 0));
function el(type: unknown, props: Record<string, unknown>): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- generic component fixture
  return { type, props } as JSX.Element;
}
function open(Page: FunctionComponent) {
  const layout = oreLayout(buildScreenTree(Page), 'live_' + ++serial);
  registerCompiledScreen(Page, { key: 'test:' + layout.screen, title: layout.title, kind: 'custom', snapshot: { ore: layout, shape: '', baked: [], vis: [] } });
  const p = { id: 'live-fields-' + serial } as Player;
  players.push(p); render(Page, p);
  const form = __oreForms.at(-1)!;
  const state = (): OreState => JSON.parse(form.labels.find(label => label.getData().startsWith(ORE_STATE_PREFIX))!.getData().slice(ORE_STATE_PREFIX.length)) as OreState;
  const bridge = form.fields.find(field => field.label instanceof ObservableString && field.label.getData().startsWith(ORE_INPUT_PREFIX + state().session + ' |'));
  let sequence = 0;
  const id = (name: string): string => layout.nodes.find(node => node.field?.name === name)!.id;
  function send(name: string, value: unknown, nextSequence = ++sequence, session = state().session): void {
    if (!(bridge?.value instanceof ObservableString)) { throw new Error('Expected live field bridge'); }
    bridge.value.setData(JSON.stringify({ session, sequence: nextSequence, id: id(name), value }));
  }
  return { form, state, layout, id, send, p };
}
function setup(enabled = true) {
  const callbacks = { sound: vi.fn(), volume: vi.fn(), mode: vi.fn(), name: vi.fn() };
  const Page: FunctionComponent = () => el(Experimental_OreUI, { children: el(Panel, { width: 200, height: 180, children: [
    el(Toggle, { name: 'sound', defaultValue: true, onChange: callbacks.sound, width: 180, height: 20, enabled }),
    el(Slider, { name: 'volume', min: 0, max: 10, step: 2, defaultValue: 4, onChange: callbacks.volume, width: 180, height: 20 }),
    el(Dropdown, { name: 'mode', defaultValue: 'b', onChange: callbacks.mode, width: 180, height: 20, children: [el(Option, { value: 'a', label: 'A' }), el(Option, { value: 'b', label: 'B' })] }),
    el(Input, { name: 'name', defaultValue: 'Alex', onChange: callbacks.name, width: 180, height: 20 }),
  ] }) });
  return { ...open(Page), callbacks };
}
afterEach(() => { for (const player of players.splice(0)) { triggerCleanup(playerOwner(player), true); } __oreForms.length = 0; });

describe('live Ore controls', () => {
  it('has no form lifecycle and refuses form roots and form action buttons', () => {
    expectTypeOf<ExperimentalOreUIProps>().not.toHaveProperty('onSubmit');
    expectTypeOf<ExperimentalOreUIProps>().not.toHaveProperty('onCancel');
    expect(() => open(() => el(Experimental_OreUI, { children: el(Form, {}) }))).toThrow(/cannot sit inside/);
    expect(() => open(() => el(Experimental_OreUI, { children: el(Form.Button, { type: 'submit' }) }))).toThrow(/not supported/);
    expect(() => open(() => el(Experimental_OreUI, { children: el(Input, { width: 180, height: 20 }) }))).not.toThrow();
  });
  it('updates each field through its own typed callback without a submit button or another native show', async () => {
    const h = setup();
    for (const [name, value] of [['sound', false], ['volume', 8], ['mode', 0], ['name', 'Sam "<&>\\中文']] as const) { h.send(name, value); await tick(); }
    expect(h.callbacks.sound).toHaveBeenCalledExactlyOnceWith(false, { player: h.p });
    expect(h.callbacks.volume).toHaveBeenCalledExactlyOnceWith(8, { player: h.p });
    expect(h.callbacks.mode).toHaveBeenCalledExactlyOnceWith('a', { player: h.p });
    expect(h.callbacks.name).toHaveBeenCalledExactlyOnceWith('Sam "<&>\\中文', { player: h.p });
    expect(h.state().values.find(value => value.id === h.id('name'))!.input).toBe('Sam "<&>\\中文');
    expect(h.state().ack).toBe(4); expect(h.form.show).toHaveBeenCalledTimes(1);
  });
  it.each([['volume', 9], ['mode', 2], ['sound', 'true'], ['name', 'x'.repeat(513)]])('rejects invalid %s before its callback', async (name, value) => {
    const h = setup(); h.send(String(name), value); await tick();
    expect(Object.values(h.callbacks).every(callback => callback.mock.calls.length === 0)).toBe(true);
    expect(h.state().error).toMatch(/Invalid value/); expect(h.state().ack).toBe(1);
  });
  it('ignores stale sessions and repeated sequences and rejects disabled changes', async () => {
    const h = setup(false); h.send('sound', false); await tick(); expect(h.callbacks.sound).not.toHaveBeenCalled();
    h.send('volume', 8, 2, h.state().session - 1); await tick(); expect(h.callbacks.volume).not.toHaveBeenCalled();
    h.send('volume', 8, 2); await tick(); h.send('volume', 6, 2); await tick();
    expect(h.callbacks.volume).toHaveBeenCalledTimes(1); expect(h.state().values.find(value => value.id === h.id('volume'))!.input).toBe(8);
  });
  it('uses only mailbox inputs and publishes server-controlled values without callback feedback', async () => {
    let set!: (value: number) => void;
    const changed = vi.fn();
    const Page = (): JSX.Element => {
      const [value, update] = useState(4); set = update;
      return el(Experimental_OreUI, { children: el(Slider, { name: 'volume', value, min: 0, max: 10, step: 2, width: 180, height: 20, onChange: (next: number) => { changed(next); update(next); } }) });
    };
    const h = open(Page);
    expect(h.form.fields).toHaveLength(2);expect(h.form.fields.every(field => field.kind === 'input')).toBe(true);
    h.send('volume', 6); await tick(); expect(changed).toHaveBeenCalledExactlyOnceWith(6);
    set(8); await tick(); expect(changed).toHaveBeenCalledTimes(1);
    expect(h.state().values.find(value => value.id === h.id('volume'))!.input).toBe(8);
  });
  it('serializes async callbacks and coalesces queued native changes per field', async () => {
    let release!: () => void; const changed = vi.fn();
    const Page = (): JSX.Element => el(Experimental_OreUI, { children: el(Slider, { name: 'volume', min: 0, max: 10, step: 2, defaultValue: 4, width: 180, height: 20, onChange: async (value: number) => { changed(value); if (value === 6) { await new Promise<void>(resolve => { release = resolve; }); } } }) });
    const h = open(Page); h.send('volume', 6); await tick(); h.send('volume', 8); h.send('volume', 10); await tick();
    expect(changed.mock.calls).toEqual([[6]]); release(); await tick(); await tick();
    expect(changed.mock.calls).toEqual([[6], [10]]); expect(h.state().values.find(value => value.id === h.id('volume'))!.input).toBe(10);
  });
  it('isolates players and discards packets from an outgoing logical screen', async () => {
    const a = setup(), b = setup(); a.send('name', 'First'); await tick(); expect(b.callbacks.name).not.toHaveBeenCalled();
    b.send('name', 'Second'); await tick(); expect(a.callbacks.name).toHaveBeenCalledTimes(1);
    const Next = (): JSX.Element => el(Experimental_OreUI, { children: el(Text, { width: 180, height: 20, children: 'Next' }) });
    const layout = oreLayout(buildScreenTree(Next), 'next_' + ++serial);
    registerCompiledScreen(Next, { key: 'test:' + layout.screen, title: layout.title, kind: 'custom', snapshot: { ore: layout, shape: '', baked: [], vis: [] } });
    render(Next, a.p); await tick(); a.send('name', 'Stale', 3, a.state().session - 1); await tick(); expect(a.callbacks.name).toHaveBeenCalledTimes(1);
  });
  it('keeps client-resolved translation messages on ordinary button captions', async () => {
    const h = open(() => el(Experimental_OreUI, { children: el(Button, { width: 180, height: 20, children: el(Text, { children: { translate: 'gui.close' } }) }) }));
    const captions = JSON.stringify(h.form.localizedLabels.map(label => label.getData()));
    expect(captions).toContain('gui.close'); expect(captions).toContain('CORE_ORE_TEXT:');
  });
});
